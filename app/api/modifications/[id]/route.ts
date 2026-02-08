import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
  const modification = await prisma.modification.findFirst({
    where: {
      id,
      logEntry: {
        car: {
          garage: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      logEntry: {
        select: {
          car: {
            select: {
              make: true,
              model: true,
              generation: true,
              currentMileage: true,
            },
          },
        },
      },
    },
  })

  if (!modification) {
    return NextResponse.json({ error: 'Modifikation nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({
    modification: {
      id: modification.id,
      partName: modification.partName,
      brand: modification.brand,
      category: modification.category,
      tuvStatus: modification.tuvStatus,
      car: modification.logEntry.car,
      mileageOnCar: modification.logEntry.car.currentMileage,
    },
  })
}
