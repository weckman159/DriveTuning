import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { conversationId } = await params
  const conv = await prisma.marketConversation.findUnique({
    where: { id: conversationId },
    include: {
      partListing: {
        include: {
          media: { select: { url: true }, orderBy: { id: 'asc' } },
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      offers: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!conv) return NextResponse.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
  const isMember = conv.buyerId === session.user.id || conv.sellerId === session.user.id
  if (!isMember) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  return NextResponse.json({
    conversation: {
      ...conv,
      partListing: {
        ...conv.partListing,
        images: conv.partListing.media.map((m) => m.url),
      },
    },
  })
}
