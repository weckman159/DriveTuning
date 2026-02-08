import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          car: true,
          user: { select: { name: true } },
        },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ event })
}
