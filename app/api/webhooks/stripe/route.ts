import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = getStripe()

  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const payload = await req.text()

  let event: any
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Webhooks can be retried and sometimes delivered more than once. We keep a small DB record
    // to guarantee idempotency and to prevent duplicate state transitions.
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id as string },
      create: { stripeEventId: event.id as string, type: String(event.type) },
      update: { type: String(event.type) },
    })

    const now = new Date()
    const staleProcessingCutoff = new Date(Date.now() - 10 * 60 * 1000)
    const claimed = await prisma.stripeWebhookEvent.updateMany({
      where: {
        stripeEventId: event.id as string,
        processedAt: null,
        OR: [{ processingAt: null }, { processingAt: { lt: staleProcessingCutoff } }],
      },
      data: { processingAt: now, type: String(event.type) },
    })

    if (claimed.count !== 1) {
      return NextResponse.json({ received: true })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { id: string; payment_intent?: string; metadata?: Record<string, string> }
      const marketOrderId = session.metadata?.marketOrderId
      if (marketOrderId) {
        await prisma.$transaction(async (tx) => {
          const order = await tx.marketOrder.findUnique({
            where: { id: marketOrderId },
            select: { id: true, status: true, partListingId: true },
          })
          if (!order) return
          if (order.status !== 'PENDING_PAYMENT') return

          await tx.marketOrder.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            },
          })

          await tx.partListing.update({
            where: { id: order.partListingId },
            data: { status: 'SOLD' },
          })
        })
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as { id: string; metadata?: Record<string, string> }
      const marketOrderId = session.metadata?.marketOrderId
      if (marketOrderId) {
        await prisma.$transaction(async (tx) => {
          const order = await tx.marketOrder.findUnique({
            where: { id: marketOrderId },
            select: { id: true, status: true, partListingId: true },
          })
          if (!order) return
          if (order.status !== 'PENDING_PAYMENT') return

          await tx.marketOrder.update({
            where: { id: order.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          })

          await tx.partListing.update({
            where: { id: order.partListingId },
            data: { status: 'ACTIVE' },
          })
        })
      }
    }

    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id as string },
      data: { processedAt: new Date(), processingAt: null },
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe-webhook] handler error', err)
    try {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: (event as any)?.id as string },
        data: { processingAt: null },
      })
    } catch {
      // ignore
    }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
