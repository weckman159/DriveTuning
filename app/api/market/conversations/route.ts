import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const userId = session.user.id
  const conversations = await prisma.marketConversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      partListing: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { id: true, body: true, createdAt: true, senderId: true },
      },
    },
  })

  return NextResponse.json({ conversations })
}
