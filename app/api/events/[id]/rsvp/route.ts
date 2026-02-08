import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id: eventId } = await params
  const body = await req.json()
  const { carId } = body

  if (!carId) {
    return NextResponse.json({ error: 'carId ist erforderlich' }, { status: 400 })
  }

  const car = await prisma.car.findFirst({
    where: { id: carId, garage: { userId: session.user.id } },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const attendance = await prisma.eventAttendance.upsert({
    where: {
      eventId_userId_carId: {
        eventId,
        userId: session.user.id,
        carId,
      },
    },
    update: { status: 'GOING' },
    create: {
      eventId,
      userId: session.user.id,
      carId,
      status: 'GOING',
    },
  })

  return NextResponse.json({ attendance }, { status: 201 })
}
