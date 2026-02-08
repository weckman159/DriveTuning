import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ conversationId: string; offerId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { conversationId, offerId } = await params
  const body = await req.json().catch(() => ({} as any))
  const action = typeof body.action === 'string' ? body.action.trim().toUpperCase() : ''
  if (action !== 'ACCEPT' && action !== 'DECLINE' && action !== 'CANCEL') {
    return NextResponse.json({ error: 'Ungueltige Aktion' }, { status: 400 })
  }

  const conv = await prisma.marketConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  })
  if (!conv) return NextResponse.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
  const isMember = conv.buyerId === session.user.id || conv.sellerId === session.user.id
  if (!isMember) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const offer = await prisma.marketOffer.findFirst({
    where: { id: offerId, conversationId: conv.id },
  })
  if (!offer) return NextResponse.json({ error: 'Preisangebot nicht gefunden' }, { status: 404 })

  if (offer.status !== 'PENDING') {
    return NextResponse.json({ error: 'Preisangebot ist nicht mehr offen' }, { status: 400 })
  }

  // Seller can accept/decline. Buyer can cancel (only their own offers).
  if (action === 'CANCEL') {
    if (offer.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Nur der Ersteller kann das Angebot abbrechen' }, { status: 403 })
    }
    const updated = await prisma.marketOffer.update({
      where: { id: offer.id },
      data: { status: 'CANCELLED' },
    })
    return NextResponse.json({ offer: updated })
  }

  if (session.user.id !== conv.sellerId) {
    return NextResponse.json({ error: 'Nur der Verkaeufer kann Angebote annehmen/ablehnen' }, { status: 403 })
  }

  const next = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
  const updated = await prisma.marketOffer.update({
    where: { id: offer.id },
    data: { status: next },
  })

  await prisma.marketConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ offer: updated })
}
