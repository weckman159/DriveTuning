import 'server-only'

import { prisma } from '@/lib/prisma'

export type HomeFeedFilter = 'all' | 'builds' | 'legal' | 'market' | 'events'

export type HomeFeedItem =
  | {
      kind: 'BUILD_UPDATE'
      id: string
      at: Date
      car: {
        id: string
        slug: string | null
        make: string
        model: string
        generation: string | null
        year: number | null
        projectGoal: string
        buildStatus: string
        heroImage: string | null
        updatedAt: Date
      }
      latestEntry:
        | null
        | {
            id: string
            type: string
            title: string
            date: Date
            totalCostImpact: number | null
            modTuvStatus: string | null
          }
    }
  | {
      kind: 'LEGAL_SPOTLIGHT'
      id: string
      at: Date
      tuvStatus: string
      partName: string
      brand: string | null
      category: string
      car: { slug: string | null; make: string; model: string; generation: string | null }
      entry: { id: string; title: string; type: string; date: Date }
      documentCount: number
    }
  | {
      kind: 'MARKET_LISTING'
      id: string
      at: Date
      title: string
      price: number
      condition: string
      status: string
      imageUrl: string | null
      car: { make: string; model: string; generation: string | null } | null
      evidenceScore: number
      tuvStatus: string | null
    }

export type HomeUpcomingEvent = {
  id: string
  title: string
  dateStart: Date
  dateEnd: Date | null
  locationRegion: string
  locationName: string
  brandFilter: string | null
  status: string
}

function deriveListingEvidenceScore(input: {
  mediaCount: number
  modification: {
    evidenceScore: number
    installedMileage: number | null
    removedMileage: number | null
    price: number | null
    tuvStatus: string
    documentCount: number
  } | null
}): number {
  if (!input.modification) return 0
  if (input.modification.evidenceScore > 0) return input.modification.evidenceScore

  // Lightweight approximation of calculateEvidenceScore to keep this module self-contained.
  // 0..100 scale.
  let score = 0
  if (input.mediaCount > 0) score += 25
  if (input.modification.installedMileage !== null) score += 15
  if (input.modification.removedMileage !== null) score += 15
  if (input.modification.price !== null) score += 15
  if (input.modification.documentCount > 0) score += 20
  if (input.modification.tuvStatus) score += 10
  return Math.min(100, score)
}

export async function getHomeFeed(input?: { filter?: HomeFeedFilter }) {
  const filter: HomeFeedFilter = input?.filter ?? 'all'
  const now = new Date()

  const wantsBuilds = filter === 'all' || filter === 'builds'
  const wantsLegal = filter === 'all' || filter === 'legal'
  const wantsMarket = filter === 'all' || filter === 'market'
  const wantsEvents = filter === 'all' || filter === 'events'

  const [cars, mods, listings, upcomingEvents] = await Promise.all([
    wantsBuilds
      ? prisma.car.findMany({
          where: { visibility: 'PUBLIC' },
          orderBy: { updatedAt: 'desc' },
          take: 12,
          select: {
            id: true,
            slug: true,
            make: true,
            model: true,
            generation: true,
            year: true,
            projectGoal: true,
            buildStatus: true,
            heroImage: true,
            updatedAt: true,
            logEntries: {
              where: { visibility: 'PUBLIC' },
              orderBy: { date: 'desc' },
              take: 1,
              select: {
                id: true,
                type: true,
                title: true,
                date: true,
                totalCostImpact: true,
                modifications: { take: 1, select: { tuvStatus: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    wantsLegal
      ? prisma.modification.findMany({
          where: {
            logEntry: { visibility: 'PUBLIC', car: { visibility: 'PUBLIC' } },
          },
          orderBy: { logEntry: { date: 'desc' } },
          take: 10,
          select: {
            id: true,
            partName: true,
            brand: true,
            category: true,
            tuvStatus: true,
            logEntry: {
              select: {
                id: true,
                title: true,
                type: true,
                date: true,
                car: { select: { slug: true, make: true, model: true, generation: true } },
              },
            },
            _count: { select: { documents: true } },
          },
        })
      : Promise.resolve([]),
    wantsMarket
      ? prisma.partListing.findMany({
          where: { status: { in: ['ACTIVE', 'RESERVED'] } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            title: true,
            price: true,
            condition: true,
            status: true,
            createdAt: true,
            car: { select: { make: true, model: true, generation: true } },
            media: { select: { url: true }, orderBy: { id: 'asc' }, take: 1 },
            modification: {
              select: {
                evidenceScore: true,
                installedMileage: true,
                removedMileage: true,
                price: true,
                tuvStatus: true,
                _count: { select: { documents: true } },
              },
            },
            _count: { select: { media: true } },
          },
        })
      : Promise.resolve([]),
    wantsEvents
      ? prisma.event.findMany({
          where: {
            status: { in: ['UPCOMING', 'ACTIVE'] },
            dateStart: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { dateStart: 'asc' },
          take: 6,
        })
      : Promise.resolve([]),
  ])

  const items: HomeFeedItem[] = []

  for (const car of cars) {
    const latest = car.logEntries[0] ?? null
    const at = latest?.date ?? car.updatedAt
    items.push({
      kind: 'BUILD_UPDATE',
      id: `build_${car.id}`,
      at,
      car: {
        id: car.id,
        slug: car.slug ?? null,
        make: car.make,
        model: car.model,
        generation: car.generation ?? null,
        year: car.year ?? null,
        projectGoal: car.projectGoal,
        buildStatus: car.buildStatus,
        heroImage: car.heroImage ?? null,
        updatedAt: car.updatedAt,
      },
      latestEntry: latest
        ? {
            id: latest.id,
            type: latest.type,
            title: latest.title,
            date: latest.date,
            totalCostImpact: latest.totalCostImpact ?? null,
            modTuvStatus: latest.modifications[0]?.tuvStatus ?? null,
          }
        : null,
    })
  }

  for (const m of mods) {
    items.push({
      kind: 'LEGAL_SPOTLIGHT',
      id: `mod_${m.id}`,
      at: m.logEntry.date,
      tuvStatus: m.tuvStatus,
      partName: m.partName,
      brand: m.brand ?? null,
      category: m.category,
      car: {
        slug: m.logEntry.car.slug ?? null,
        make: m.logEntry.car.make,
        model: m.logEntry.car.model,
        generation: m.logEntry.car.generation ?? null,
      },
      entry: {
        id: m.logEntry.id,
        title: m.logEntry.title,
        type: m.logEntry.type,
        date: m.logEntry.date,
      },
      documentCount: m._count.documents,
    })
  }

  for (const l of listings) {
    const imageUrl = l.media[0]?.url ?? null
    const mod = l.modification
    const evidenceScore = deriveListingEvidenceScore({
      mediaCount: l._count.media,
      modification: mod
        ? {
            evidenceScore: mod.evidenceScore,
            installedMileage: mod.installedMileage,
            removedMileage: mod.removedMileage,
            price: mod.price,
            tuvStatus: mod.tuvStatus,
            documentCount: mod._count.documents,
          }
        : null,
    })
    items.push({
      kind: 'MARKET_LISTING',
      id: `listing_${l.id}`,
      at: l.createdAt,
      title: l.title,
      price: l.price,
      condition: l.condition,
      status: l.status,
      imageUrl,
      car: l.car ? { make: l.car.make, model: l.car.model, generation: l.car.generation ?? null } : null,
      evidenceScore,
      tuvStatus: mod?.tuvStatus ?? null,
    })
  }

  // Sort by freshness; upcoming events are rendered separately to avoid mixing future dates with "latest".
  items.sort((a, b) => b.at.getTime() - a.at.getTime())

  return { items, upcomingEvents: upcomingEvents as HomeUpcomingEvent[] }
}

