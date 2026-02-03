import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, price, condition, mileageOnCar, modificationId } = body

  try {
    const listing = await prisma.partListing.create({
      data: {
        sellerId: session.user.id,
        title,
        description,
        price: parseFloat(price),
        condition,
        mileageOnCar: mileageOnCar ? parseInt(mileageOnCar) : null,
        modificationId: modificationId || null,
      },
      include: {
        seller: { select: { id: true, name: true } },
        car: { select: { id: true, make: true, model: true, generation: true } },
        modification: { select: { id: true, partName: true, brand: true } },
      },
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}
