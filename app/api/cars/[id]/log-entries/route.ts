import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseElementVisibilityOrDefault, parseLogEntryType, parseTuvStatus } from '@/lib/vocab'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id: carId } = await params
  const body = await req.json().catch(() => ({} as any))
  const type = parseLogEntryType((body as any).type)
  const title = typeof (body as any).title === 'string' ? (body as any).title.trim() : ''
  const description = typeof (body as any).description === 'string' ? (body as any).description.trim() : null
  const dateRaw = (body as any).date
  const totalCostImpactRaw = (body as any).totalCostImpact
  const modification = (body as any).modification
  const elementVisibility = parseElementVisibilityOrDefault((body as any).visibility, 'SELF')

  if (!type) return NextResponse.json({ error: 'Ungueltiger Typ' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })

  const parsedDate = new Date(String(dateRaw || ''))
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Ungueltiges Datum' }, { status: 400 })
  }

  const totalCostImpact =
    totalCostImpactRaw === null || totalCostImpactRaw === undefined || totalCostImpactRaw === ''
      ? null
      : Number(totalCostImpactRaw)

  if (totalCostImpact !== null && (!Number.isFinite(totalCostImpact) || totalCostImpact < 0)) {
    return NextResponse.json({ error: 'Ungueltiger Betrag' }, { status: 400 })
  }

  // Verify car belongs to user
  const car = await prisma.car.findFirst({
    where: {
      id: carId,
      garage: { userId: session.user.id },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  if (type === 'MODIFICATION' && modification !== undefined && modification !== null) {
    const partName = typeof (modification as any).partName === 'string' ? (modification as any).partName.trim() : ''
    const category = typeof (modification as any).category === 'string' ? (modification as any).category.trim() : ''
    const tuvStatus = parseTuvStatus((modification as any).tuvStatus)
    if (!tuvStatus) return NextResponse.json({ error: 'Ungueltiger TUEV-Status' }, { status: 400 })
    if (!partName) return NextResponse.json({ error: 'Teilname ist erforderlich' }, { status: 400 })
    if (!category) return NextResponse.json({ error: 'Kategorie ist erforderlich' }, { status: 400 })

    const priceRaw = (modification as any).price
    if (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') {
      const price = Number(priceRaw)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Ungueltiger Preis' }, { status: 400 })
      }
    }
  }

  if (type === 'MODIFICATION' && (modification === undefined || modification === null)) {
    return NextResponse.json({ error: 'Fuer Modifikationen sind Teildaten erforderlich' }, { status: 400 })
  }

  // Create log entry
  const logEntry = await prisma.logEntry.create({
    data: {
      carId,
      visibility: elementVisibility,
      type,
      title,
      description,
      date: parsedDate,
      totalCostImpact,
      modifications:
        type === 'MODIFICATION' && modification
          ? {
              create: {
                partName: String((modification as any).partName || '').trim(),
                brand: typeof (modification as any).brand === 'string' ? (modification as any).brand.trim() : null,
                category: String((modification as any).category || '').trim(),
                price:
                  (modification as any).price === null || (modification as any).price === undefined || (modification as any).price === ''
                    ? null
                    : Number((modification as any).price),
                tuvStatus: parseTuvStatus((modification as any).tuvStatus) || 'YELLOW_ABE',
              },
            }
          : undefined,
    },
    include: {
      modifications: true,
    },
  })

  return NextResponse.json(logEntry, { status: 201 })
}
