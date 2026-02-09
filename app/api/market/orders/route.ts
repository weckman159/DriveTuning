import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { marketCommerceEnabled } from '@/lib/feature-flags'
import { consumeRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

function getAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  return env.trim().replace(/\/+$/, '')
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  if (!marketCommerceEnabled()) {
    return NextResponse.json({ error: 'Zahlungen sind deaktiviert' }, { status: 403 })
  }

  const rl = await consumeRateLimit({
    namespace: 'market:orders:user',
    identifier: session.user.id,
    limit: 5,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Checkout-Versuche. Bitte spaeter erneut versuchen.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const appUrl = getAppUrl()
  if (!appUrl) return NextResponse.json({ error: 'APP_URL ist nicht konfiguriert' }, { status: 500 })

  const bodySchema = z.object({
    listingId: z.string().trim().min(1),
    offerId: z.string().trim().optional(),
    termsAccepted: z.boolean(),
  })
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })

  const listingId = parsed.data.listingId
  const offerId = parsed.data.offerId || ''
  const termsAccepted = parsed.data.termsAccepted
  if (!listingId) return NextResponse.json({ error: 'listingId fehlt' }, { status: 400 })
  if (!termsAccepted) {
    return NextResponse.json(
      { error: 'Bitte AGB und Widerruf akzeptieren, bevor du bezahlst.' },
      { status: 400 }
    )
  }

  const listing = await prisma.partListing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, price: true, status: true, sellerId: true },
  })
  if (!listing) return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  if (listing.sellerId === session.user.id) return NextResponse.json({ error: 'Du kannst dein eigenes Angebot nicht kaufen' }, { status: 400 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Angebot ist nicht verfuegbar' }, { status: 400 })

  const sellerAccount = await prisma.stripeConnectAccount.findUnique({
    where: { userId: listing.sellerId },
    select: { verificationStatus: true },
  })
  if (!sellerAccount || sellerAccount.verificationStatus !== 'VERIFIED') {
    return NextResponse.json({ error: 'Verkaeufer ist nicht fuer Zahlungen verifiziert' }, { status: 403 })
  }

  let amountCents = Math.round(Number(listing.price) * 100)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Ungueltiger Angebotspreis' }, { status: 400 })
  }

  if (offerId) {
    const offer = await prisma.marketOffer.findFirst({
      where: { id: offerId, status: 'ACCEPTED' },
      include: { conversation: { select: { buyerId: true, sellerId: true, partListingId: true } } },
    })
    if (!offer) return NextResponse.json({ error: 'Preisangebot nicht gefunden' }, { status: 404 })
    if (offer.conversation.partListingId !== listing.id) return NextResponse.json({ error: 'Preisangebot passt nicht zum Angebot' }, { status: 400 })
    if (offer.conversation.buyerId !== session.user.id) return NextResponse.json({ error: 'Preisangebot gehoert nicht dir' }, { status: 403 })
    amountCents = offer.amountCents
    if (!Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ error: 'Ungueltiger Angebotsbetrag' }, { status: 400 })
  }

  const stripe = getStripe()

  const order = await prisma.$transaction(async (tx) => {
    // Reserve listing to prevent double checkout (best-effort lock).
    const reserved = await tx.partListing.updateMany({
      where: { id: listing.id, status: 'ACTIVE' },
      data: { status: 'RESERVED' },
    })

    if (reserved.count !== 1) {
      throw new Error('Angebot ist nicht verfuegbar')
    }

    const created = await tx.marketOrder.create({
      data: {
        partListingId: listing.id,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amountCents,
        currency: 'EUR',
        status: 'PENDING_PAYMENT',
      },
    })

    return { order: created }
  })

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email || undefined,
      // Keep v1 simple/fast: cards only (no async settlement payment methods).
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: listing.title },
            unit_amount: order.order.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        marketOrderId: order.order.id,
        listingId: listing.id,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${appUrl}/market/order/${encodeURIComponent(order.order.id)}?status=success`,
      cancel_url: `${appUrl}/market/${encodeURIComponent(listing.id)}?status=cancelled`,
    })

    await prisma.marketOrder.update({
      where: { id: order.order.id },
      data: { stripeCheckoutSessionId: checkout.id },
    })

    return NextResponse.json({ url: checkout.url, orderId: order.order.id }, { status: 201 })
  } catch (err) {
    console.error('[market-orders] checkout error', err)
    await prisma.$transaction(async (tx) => {
      await tx.marketOrder.update({
        where: { id: order.order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
      await tx.partListing.update({
        where: { id: listing.id },
        data: { status: 'ACTIVE' },
      })
    })

    return NextResponse.json({ error: 'Checkout-Session konnte nicht erstellt werden' }, { status: 500 })
  }
}
