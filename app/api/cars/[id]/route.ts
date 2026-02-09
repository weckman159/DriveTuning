import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseBuildStatus, parseCarVisibility } from '@/lib/vocab'
import { computeTuvReadiness } from '@/lib/tuv-ready'
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
  const car = await prisma.car.findFirst({
    where: {
      id,
      garage: { userId: session.user.id },
    },
    include: {
      logEntries: {
        include: {
          modifications: {
            include: {
              documents: { select: { id: true, type: true } },
              approvalDocuments: { select: { id: true, approvalType: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const modifications = car.logEntries.flatMap((e) => e.modifications || [])
  const tuvReadiness = computeTuvReadiness(modifications as any)

  return NextResponse.json({ car, tuvReadiness })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({} as any))
  const { forSale, askingPrice, visibility, buildStatus } = body as any

  const car = await prisma.car.findFirst({
    where: {
      id,
      garage: { userId: session.user.id },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const nextVisibility = typeof visibility === 'string' ? visibility.trim().toUpperCase() : undefined
  if (nextVisibility !== undefined && !parseCarVisibility(nextVisibility)) {
    return NextResponse.json({ error: 'Ungueltige Sichtbarkeit' }, { status: 400 })
  }

  const nextBuildStatus = typeof buildStatus === 'string' ? buildStatus.trim().toUpperCase() : undefined
  if (nextBuildStatus !== undefined && !parseBuildStatus(nextBuildStatus)) {
    return NextResponse.json({ error: 'Ungueltiger Build-Status' }, { status: 400 })
  }

  const updated = await prisma.car.update({
    where: { id },
    data: {
      forSale: forSale === undefined ? car.forSale : !!forSale,
      askingPrice: askingPrice === null || askingPrice === undefined ? null : askingPrice,
      visibility: nextVisibility ?? car.visibility,
      buildStatus: nextBuildStatus ?? car.buildStatus,
    },
  })

  return NextResponse.json({ car: updated })
}
