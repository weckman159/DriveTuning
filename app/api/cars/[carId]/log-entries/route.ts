import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { carId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { carId } = params
  const body = await req.json()
  const { type, title, description, date, totalCostImpact, modification } = body

  // Verify car belongs to user
  const car = await prisma.car.findFirst({
    where: {
      id: carId,
      garage: { userId: session.user.id },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Car not found' }, { status: 404 })
  }

  try {
    const logEntry = await prisma.logEntry.create({
      data: {
        carId,
        type,
        title,
        description,
        date: new Date(date),
        totalCostImpact: totalCostImpact ? parseFloat(totalCostImpact) : null,
      },
    })

    let createdModification = null

    if (type === 'MODIFICATION' && modification) {
      createdModification = await prisma.modification.create({
        data: {
          logEntryId: logEntry.id,
          partName: modification.partName,
          brand: modification.brand || null,
          category: modification.category,
          price: modification.price ? parseFloat(modification.price) : null,
          tuvStatus: modification.tuvStatus,
        },
      })
    }

    return NextResponse.json(
      { logEntry, modification: createdModification },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating log entry:', error)
    return NextResponse.json(
      { error: 'Failed to create log entry' },
      { status: 500 }
    )
  }
}
