import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const listing = await prisma.partListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true },
  })
  if (!listing) return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })

  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: 'Du kannst keinen Chat mit dir selbst starten' }, { status: 400 })
  }

  const conv = await prisma.marketConversation.upsert({
    where: {
      partListingId_buyerId: {
        partListingId: listing.id,
        buyerId: session.user.id,
      },
    },
    update: {
      updatedAt: new Date(),
    },
    create: {
      partListingId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
    },
    select: { id: true },
  })

  return NextResponse.json({ conversationId: conv.id }, { status: 201 })
}
