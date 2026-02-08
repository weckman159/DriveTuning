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
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Nachricht ist erforderlich' }, { status: 400 })
  if (message.length > 2000) return NextResponse.json({ error: 'Nachricht ist zu lang' }, { status: 400 })

  const conv = await prisma.marketConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  })
  if (!conv) return NextResponse.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
  const isMember = conv.buyerId === session.user.id || conv.sellerId === session.user.id
  if (!isMember) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
  const recentCount = await prisma.marketMessage.count({
    where: { conversationId: conv.id, senderId: session.user.id, createdAt: { gt: oneMinuteAgo } },
  })
  if (recentCount >= 8) {
    return NextResponse.json({ error: 'Zu viele Nachrichten in kurzer Zeit' }, { status: 429 })
  }

  const created = await prisma.marketMessage.create({
    data: {
      conversationId: conv.id,
      senderId: session.user.id,
      body: message,
    },
  })

  await prisma.marketConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ message: created }, { status: 201 })
}
