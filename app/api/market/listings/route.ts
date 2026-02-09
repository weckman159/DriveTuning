import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImages } from '@/lib/image-storage'
import { calculateEvidenceScoreV2 } from '@/lib/evidence-score'
import { parseListingCondition } from '@/lib/vocab'
import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const APPROVAL_TYPES = new Set(['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'])
const TRUSTED_APPROVAL_TYPES = new Set(['EINTRAGUNG', 'EINZELABNAHME'])
const LEGALITY_STATUSES = new Set([
  'UNKNOWN',
  'FULLY_LEGAL',
  'REGISTRATION_REQUIRED',
  'INSPECTION_REQUIRED',
  'ILLEGAL',
  'LEGAL_WITH_RESTRICTIONS',
])

function deriveListingLegalityFromModification(mod: {
  legalityStatus?: string | null
  legalityApprovalType?: string | null
  legalityApprovalNumber?: string | null
  legalitySourceId?: string | null
  legalitySourceUrl?: string | null
  legalityNotes?: string | null
  legalityLastCheckedAt?: Date | null
} | null) {
  const statusRaw = String(mod?.legalityStatus || 'UNKNOWN').trim().toUpperCase()
  const legalityStatus = LEGALITY_STATUSES.has(statusRaw) ? statusRaw : 'UNKNOWN'
  return {
    legalityStatus,
    legalityApprovalType: mod?.legalityApprovalType ?? null,
    legalityApprovalNumber: mod?.legalityApprovalNumber ?? null,
    legalitySourceId: mod?.legalitySourceId ?? null,
    legalitySourceUrl: mod?.legalitySourceUrl ?? null,
    legalityNotes: mod?.legalityNotes ?? null,
    legalityLastCheckedAt: mod?.legalityLastCheckedAt ?? null,
    isFullyLegal: legalityStatus === 'FULLY_LEGAL' || legalityStatus === 'LEGAL_WITH_RESTRICTIONS',
    requiresRegistration: legalityStatus === 'REGISTRATION_REQUIRED',
    requiresInspection: legalityStatus === 'INSPECTION_REQUIRED',
  }
}

function buildEvidence(listing: {
  media: { url: string }[]
  modification: {
    installedAt: Date | null
    removedAt: Date | null
    installedMileage: number | null
    removedMileage: number | null
    tuvStatus: string
    documents: { type: string }[]
    approvalDocuments: { approvalType: string }[]
  } | null
}) {
  if (!listing.modification) {
    return { score: 0, tier: 'NONE' as const, breakdown: { photo: 0, mileage: 0, approval: 0, timestamp: 0 } }
  }

  const docTypes = new Set(
    (listing.modification.documents || []).map((d) => String(d.type || '').trim().toUpperCase()).filter(Boolean)
  )
  const approvalTypes = new Set(
    (listing.modification.approvalDocuments || [])
      .map((d) => String(d.approvalType || '').trim().toUpperCase())
      .filter(Boolean)
  )

  const hasTrustedApprovalDoc =
    Array.from(approvalTypes).some((t) => TRUSTED_APPROVAL_TYPES.has(t)) ||
    Array.from(docTypes).some((t) => TRUSTED_APPROVAL_TYPES.has(t))

  const hasAnyApprovalSignal =
    Array.from(approvalTypes).some((t) => APPROVAL_TYPES.has(t)) ||
    Array.from(docTypes).some((t) => APPROVAL_TYPES.has(t)) ||
    String(listing.modification.tuvStatus || '').trim().toUpperCase() === 'GREEN_REGISTERED'

  return calculateEvidenceScoreV2({
    hasPhotos: listing.media.length > 0,
    hasMileageProof: listing.modification.installedMileage !== null || listing.modification.removedMileage !== null,
    hasTrustedApprovalDoc,
    hasAnyApprovalSignal,
    hasTimestamp: listing.modification.installedAt !== null || listing.modification.removedAt !== null,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const rl = await consumeRateLimit({
    namespace: 'market:listings:create:user',
    identifier: session.user.id,
    limit: 10,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Inserate in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const bodySchema = z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(4000).optional().nullable(),
    price: z.coerce.number(),
    condition: z.string(),
    mileageOnCar: z.union([z.number(), z.string()]).optional().nullable(),
    modificationId: z.string().trim().optional().nullable(),
    images: z.array(z.string()).optional(),
  })
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })

  const title = parsed.data.title
  const description = parsed.data.description ?? null
  const numericPrice = Number(parsed.data.price)
  const condition = parseListingCondition(parsed.data.condition)
  const mileageOnCarRaw = parsed.data.mileageOnCar
  const modificationIdRaw = parsed.data.modificationId
  const images = parsed.data.images
  const safeImageInputs = Array.isArray(images)
    ? images.filter((img: unknown): img is string => typeof img === 'string' && (img.startsWith('data:image/') || /^https?:\/\//.test(img))).slice(0, 4)
    : []

  if (!title || !Number.isFinite(numericPrice) || numericPrice < 0 || !condition) {
    return NextResponse.json({ error: 'Titel, gueltiger Preis und Zustand sind erforderlich' }, { status: 400 })
  }

  const mileageOnCar =
    mileageOnCarRaw === null || mileageOnCarRaw === undefined || mileageOnCarRaw === ''
      ? null
      : Number(mileageOnCarRaw)

  if (mileageOnCar !== null && (!Number.isFinite(mileageOnCar) || mileageOnCar < 0)) {
    return NextResponse.json({ error: 'Ungueltiger Kilometerstand am Auto' }, { status: 400 })
  }

  let modificationId: string | null = null
  let carId: string | null = null
  let legalitySnapshot:
    | ReturnType<typeof deriveListingLegalityFromModification>
    | null = null
  if (typeof modificationIdRaw === 'string' && modificationIdRaw.trim()) {
    modificationId = modificationIdRaw.trim()
    const mod = await prisma.modification.findFirst({
      where: {
        id: modificationId,
        logEntry: { car: { garage: { userId: session.user.id } } },
      },
      select: {
        id: true,
        legalityStatus: true,
        legalityApprovalType: true,
        legalityApprovalNumber: true,
        legalitySourceId: true,
        legalitySourceUrl: true,
        legalityNotes: true,
        legalityLastCheckedAt: true,
        logEntry: { select: { carId: true } },
      },
    })

    if (!mod) {
      return NextResponse.json({ error: 'Ungueltige modificationId' }, { status: 400 })
    }

    carId = mod.logEntry.carId
    legalitySnapshot = deriveListingLegalityFromModification(mod)
  }

  try {
    const persistedImages = await persistImages(safeImageInputs, `market/${session.user.id}`)

    const listing = await prisma.partListing.create({
      data: {
        sellerId: session.user.id,
        title,
        description,
        price: numericPrice,
        condition,
        mileageOnCar: mileageOnCar === null ? null : Math.floor(mileageOnCar),
        carId,
        modificationId,
        ...(legalitySnapshot || deriveListingLegalityFromModification(null)),
        media: persistedImages.length > 0
          ? {
              create: persistedImages.map((url) => ({
                type: 'IMAGE',
                url,
              })),
            }
          : undefined,
      },
      include: {
        seller: { select: { id: true, name: true } },
        car: { select: { id: true, make: true, model: true, generation: true, heroImage: true } },
        modification: {
          select: {
            id: true,
            partName: true,
            brand: true,
            category: true,
            tuvStatus: true,
            installedAt: true,
            installedMileage: true,
            removedAt: true,
            removedMileage: true,
            documents: { select: { type: true } },
            approvalDocuments: { select: { approvalType: true } },
          },
        },
        media: { select: { url: true }, orderBy: { id: 'asc' } },
      },
    })

    const evidence = buildEvidence(listing as any)
    return NextResponse.json({
      listing: {
        ...listing,
        images: listing.media.map((m) => m.url),
        evidenceScore: evidence.score,
        evidenceTier: evidence.tier,
        evidenceBreakdown: evidence.breakdown,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    const msg = error instanceof Error ? error.message : 'Angebot konnte nicht erstellt werden'
    if (msg === 'Media storage not configured') {
      return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
    }
    if (msg === 'Image too large' || msg === 'Unsupported image type') {
      const mapped = msg === 'Image too large' ? 'Bild zu gross' : 'Bildtyp nicht unterstuetzt'
      return NextResponse.json({ error: mapped }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Angebot konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const legalityStatus = (searchParams.get('legalityStatus') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => LEGALITY_STATUSES.has(s))
  const minPriceRaw = searchParams.get('minPrice')
  const maxPriceRaw = searchParams.get('maxPrice')
  const conditionsRaw = (searchParams.get('condition') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const brands = (searchParams.get('brands') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const minPrice = minPriceRaw ? Number(minPriceRaw) : null
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null
  type ParsedCondition = Exclude<ReturnType<typeof parseListingCondition>, null>
  const conditions = conditionsRaw
    .map((c) => parseListingCondition(c))
    .filter((c): c is ParsedCondition => Boolean(c))

  const where: any = {}
  if (legalityStatus.length) where.legalityStatus = { in: legalityStatus }
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {}
    if (Number.isFinite(minPrice)) where.price.gte = minPrice
    if (Number.isFinite(maxPrice)) where.price.lte = maxPrice
  }
  if (conditions.length) where.condition = { in: conditions }
  if (brands.length) where.modification = { is: { brand: { in: brands } } }

  const listings = await prisma.partListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      seller: { select: { id: true, name: true } },
      car: { select: { id: true, make: true, model: true, generation: true, heroImage: true } },
      modification: {
        select: {
          id: true,
          partName: true,
          brand: true,
          category: true,
          tuvStatus: true,
          installedAt: true,
          installedMileage: true,
          removedAt: true,
          removedMileage: true,
          documents: { select: { type: true } },
          approvalDocuments: { select: { approvalType: true } },
        },
      },
      media: { select: { url: true }, orderBy: { id: 'asc' } },
    },
  })

  return NextResponse.json({
    listings: listings.map((listing) => ({
      ...listing,
      images: listing.media.map((m) => m.url),
      ...(() => {
        const evidence = buildEvidence(listing as any)
        return { evidenceScore: evidence.score, evidenceTier: evidence.tier }
      })(),
    })),
  })
}

