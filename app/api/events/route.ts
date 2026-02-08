import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { dateStart: 'asc' },
  })

  return NextResponse.json({ events })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const title = typeof (body as any).title === 'string' ? (body as any).title.trim() : ''
  const description =
    (body as any).description === null || (body as any).description === undefined
      ? null
      : typeof (body as any).description === 'string'
        ? (body as any).description.trim()
        : null
  const dateStartRaw = (body as any).dateStart
  const dateEndRaw = (body as any).dateEnd
  const locationRegion = typeof (body as any).locationRegion === 'string' ? (body as any).locationRegion.trim() : ''
  const locationName = typeof (body as any).locationName === 'string' ? (body as any).locationName.trim() : ''
  const brandFilter =
    (body as any).brandFilter === null || (body as any).brandFilter === undefined
      ? null
      : typeof (body as any).brandFilter === 'string'
        ? (body as any).brandFilter.trim()
        : null

  if (!title || !dateStartRaw || !locationRegion || !locationName) {
    return NextResponse.json(
      { error: 'Titel, Datum, Region und Ort sind erforderlich' },
      { status: 400 }
    )
  }

  const dateStart = new Date(String(dateStartRaw))
  if (Number.isNaN(dateStart.getTime())) {
    return NextResponse.json({ error: 'Ungueltiges Startdatum' }, { status: 400 })
  }

  const dateEnd = dateEndRaw ? new Date(String(dateEndRaw)) : null
  if (dateEnd && Number.isNaN(dateEnd.getTime())) {
    return NextResponse.json({ error: 'Ungueltiges Enddatum' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      dateStart,
      dateEnd,
      locationRegion,
      locationName,
      brandFilter,
      status: 'UPCOMING',
    },
  })

  return NextResponse.json({ event }, { status: 201 })
}
