import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { conversationId } = await params
  const body = await req.json().catch(() => ({} as any))
  const amountRaw = body.amountCents ?? body.amount ?? null
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'EUR'

  const amountCents = Number(amountRaw)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Ungueltiger Betrag' }, { status: 400 })
  }
  if (currency !== 'EUR') {
    return NextResponse.json({ error: 'Aktuell wird nur EUR unterstuetzt' }, { status: 400 })
  }

  const conv = await prisma.marketConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  })
  if (!conv) return NextResponse.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
  const isMember = conv.buyerId === session.user.id || conv.sellerId === session.user.id
  if (!isMember) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const recentOffers = await prisma.marketOffer.count({
    where: { conversationId: conv.id, createdById: session.user.id, createdAt: { gt: fiveMinutesAgo } },
  })
  if (recentOffers >= 5) {
    return NextResponse.json({ error: 'Zu viele Angebote in kurzer Zeit' }, { status: 429 })
  }

  const created = await prisma.marketOffer.create({
    data: {
      conversationId: conv.id,
      createdById: session.user.id,
      amountCents: Math.floor(amountCents),
      currency,
      status: 'PENDING',
    },
  })

  await prisma.marketConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ offer: created }, { status: 201 })
}
