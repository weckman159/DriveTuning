import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { generateShareToken } from '@/lib/share-token'

async function ensureUniqueSlug(carId: string, preferred: string): Promise<string> {
  const base = slugify(preferred) || `build-${Math.random().toString(36).slice(2, 8)}`
  let slug = base
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`
    const exists = await prisma.car.findUnique({ where: { slug: candidate } })
    if (!exists) return candidate
  }
  // Extremely unlikely fallback.
  return `${base}-${Date.now()}`
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const expiresInDaysRaw = (body as any)?.expiresInDays
  const expiresAtRaw = (body as any)?.expiresAt

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: {
      id: true,
      slug: true,
      make: true,
      model: true,
      generation: true,
      year: true,
      visibility: true,
    },
  })

  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  if (car.visibility === 'PRIVATE') {
    return NextResponse.json(
      { error: 'Private Builds koennen nicht geteilt werden. Stelle die Sichtbarkeit auf NICHT GELISTET oder OEFFENTLICH.' },
      { status: 400 }
    )
  }

  let expiresAt: Date | null = null
  if (expiresAtRaw !== undefined && expiresAtRaw !== null) {
    const d = new Date(String(expiresAtRaw))
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Ungueltiges Ablaufdatum' }, { status: 400 })
    }
    expiresAt = d
  } else if (typeof expiresInDaysRaw === 'number') {
    const days = Math.floor(expiresInDaysRaw)
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Ungueltige Anzahl Tage' }, { status: 400 })
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  } else if (typeof expiresInDaysRaw === 'string' && expiresInDaysRaw.trim()) {
    const days = Number(expiresInDaysRaw)
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Ungueltige Anzahl Tage' }, { status: 400 })
    }
    expiresAt = new Date(Date.now() + Math.floor(days) * 24 * 60 * 60 * 1000)
  }

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Ablaufdatum muss in der Zukunft liegen' }, { status: 400 })
  }

  // Backfill slug if needed so we can share /build/[slug]
  let slug = car.slug
  if (!slug) {
    slug = await ensureUniqueSlug(car.id, `${car.make} ${car.model} ${car.generation || ''} ${car.year || ''}`)
    await prisma.car.update({ where: { id: car.id }, data: { slug } })
  }

  const shareLink = await prisma.shareLink.create({
    data: {
      token: generateShareToken(),
      ownerId: session.user.id,
      carId: car.id,
      visibility: 'READ_ONLY',
      expiresAt,
    },
    select: { id: true, token: true, createdAt: true, expiresAt: true, revokedAt: true },
  })

  return NextResponse.json({ shareLink, slug }, { status: 201 })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true, slug: true, make: true, model: true, generation: true, year: true },
  })

  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  let slug = car.slug
  if (!slug) {
    slug = await ensureUniqueSlug(car.id, `${car.make} ${car.model} ${car.generation || ''} ${car.year || ''}`)
    await prisma.car.update({ where: { id: car.id }, data: { slug } })
  }

  const links = await prisma.shareLink.findMany({
    where: { carId: car.id, ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      visibility: true,
      _count: { select: { views: true } },
    },
  })

  const linkIds = links.map((l) => l.id)
  const lastViews = linkIds.length
    ? await prisma.shareLinkView.groupBy({
        by: ['shareLinkId'],
        where: { shareLinkId: { in: linkIds } },
        _max: { viewedAt: true },
      })
    : []

  const uniqueGroups = linkIds.length
    ? await prisma.shareLinkView.groupBy({
        by: ['shareLinkId', 'viewerHash'],
        where: { shareLinkId: { in: linkIds }, viewerHash: { not: null } },
      })
    : []

  const lastViewedAtById = new Map<string, Date | null>(
    lastViews.map((row) => [row.shareLinkId, row._max.viewedAt ?? null])
  )

  const uniqueById = new Map<string, number>()
  for (const g of uniqueGroups) {
    uniqueById.set(g.shareLinkId, (uniqueById.get(g.shareLinkId) || 0) + 1)
  }

  const enriched = links.map((l) => ({
    ...l,
    lastViewedAt: lastViewedAtById.get(l.id) ?? null,
    uniqueViewers: uniqueById.get(l.id) ?? 0,
  }))

  return NextResponse.json({ links: enriched, slug })
}
