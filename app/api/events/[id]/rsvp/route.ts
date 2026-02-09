import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getRegionalRules } from '@/lib/legality/regional-rules'

function mapModificationCategoryToDictionaryCategory(category?: string | null) {
  const c = String(category || '').trim().toUpperCase()
  if (c === 'AERO') return 'aero'
  if (c === 'BRAKES') return 'brakes'
  if (c === 'WHEELS') return 'wheels'
  if (c === 'SUSPENSION') return 'suspension'
  if (c === 'EXHAUST') return 'exhaust'
  if (c === 'LIGHTING') return 'lighting'
  if (c === 'ECU') return 'ecu'
  if (c === 'ENGINE') return 'ecu'
  if (c === 'INTERIOR') return 'interior'
  return null
}

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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, visibility: true, stateId: true },
  })
  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 })
  }

  // For public events, be conservative: block RSVP if the car has any ILLEGAL modifications.
  if (String(event.visibility || '').toUpperCase() === 'PUBLIC') {
    const illegal = await prisma.modification.findMany({
      where: {
        legalityStatus: 'ILLEGAL',
        logEntry: { carId },
      },
      select: { id: true, brand: true, partName: true, legalityNotes: true, category: true },
      take: 3,
      orderBy: { id: 'asc' },
    })

    if (illegal.length > 0) {
      return NextResponse.json(
        {
          error: 'Nicht zulaessige Modifikationen',
          message:
            'Fuer oeffentliche Events darfst du nur mit einem verkehrstauglichen Setup teilnehmen. Bitte pruefe/entferne nicht zulaessige Modifikationen.',
          illegalModifications: illegal.map((m) => ({
            id: m.id,
            brand: m.brand,
            partName: m.partName,
            category: m.category,
            notes: m.legalityNotes || null,
          })),
        },
        { status: 400 }
      )
    }
  }

  // Attach regional rules warnings (best-effort) for the event state and the car's active modification categories.
  let regionalWarnings: string[] = []
  try {
    const stateId = event.stateId
    if (stateId) {
      const categories = await prisma.modification.findMany({
        where: { logEntry: { carId } },
        select: { category: true },
        distinct: ['category'],
        take: 25,
      })
      const catIds = categories
        .map((c) => mapModificationCategoryToDictionaryCategory(c.category))
        .filter(Boolean) as string[]

      const uniq = new Map<string, any>()
      for (const catId of catIds) {
        for (const r of getRegionalRules({ stateId, categoryId: catId })) {
          if (r && r.id && !uniq.has(r.id)) uniq.set(r.id, r)
        }
      }
      regionalWarnings = Array.from(uniq.values()).map((r) => `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`)
    }
  } catch {
    regionalWarnings = []
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

  return NextResponse.json({ attendance, regionalWarnings: regionalWarnings.length ? regionalWarnings : undefined }, { status: 201 })
}
