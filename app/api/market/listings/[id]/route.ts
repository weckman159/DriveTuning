import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImages } from '@/lib/image-storage'
import { calculateEvidenceScoreV2 } from '@/lib/evidence-score'
import { parseListingCondition, parseListingStatus, type ListingCondition, type ListingStatus } from '@/lib/vocab'
import { NextResponse } from 'next/server'

const APPROVAL_TYPES = new Set(['ABE', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'])
const TRUSTED_APPROVAL_TYPES = new Set(['EINTRAGUNG', 'EINZELABNAHME'])

function buildEvidence(listing: {
  media: { id?: string; url: string }[]
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const listing = await prisma.partListing.findUnique({
    where: { id },
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
      media: { select: { id: true, url: true }, orderBy: { id: 'asc' } },
    },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  const evidence = buildEvidence(listing as any)
  return NextResponse.json({
    listing: {
      ...listing,
      images: listing.media.map((m) => m.url),
      evidenceScore: evidence.score,
      evidenceTier: evidence.tier,
      evidenceBreakdown: evidence.breakdown,
    },
  })
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
  const listing = await prisma.partListing.findUnique({
    where: { id },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))

  const title = (body as any).title === undefined ? undefined : (typeof (body as any).title === 'string' ? (body as any).title.trim() : '')
  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
  }

  const description =
    (body as any).description === undefined
      ? undefined
      : (body as any).description === null
        ? null
        : typeof (body as any).description === 'string'
          ? (body as any).description.trim()
          : null

  const priceRaw = (body as any).price
  const price = priceRaw === undefined ? undefined : Number(priceRaw)
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: 'Ungueltiger Preis' }, { status: 400 })
  }

  const conditionRaw = (body as any).condition
  let condition: ListingCondition | undefined
  if (conditionRaw !== undefined) {
    const parsedCondition = parseListingCondition(conditionRaw)
    if (!parsedCondition) {
      return NextResponse.json({ error: 'Ungueltiger Zustand' }, { status: 400 })
    }
    condition = parsedCondition
  }

  const mileageOnCarRaw = (body as any).mileageOnCar
  const mileageOnCar =
    mileageOnCarRaw === undefined
      ? undefined
      : mileageOnCarRaw === null || mileageOnCarRaw === ''
        ? null
        : Number(mileageOnCarRaw)
  if (mileageOnCar !== undefined && mileageOnCar !== null && (!Number.isFinite(mileageOnCar) || mileageOnCar < 0)) {
    return NextResponse.json({ error: 'Ungueltiger Kilometerstand am Auto' }, { status: 400 })
  }

  const statusRaw = (body as any).status
  let status: ListingStatus | undefined
  if (statusRaw !== undefined) {
    const parsedStatus = parseListingStatus(statusRaw)
    if (!parsedStatus) {
      return NextResponse.json({ error: 'Ungueltiger Status' }, { status: 400 })
    }
    status = parsedStatus
  }

  const images = (body as any).images
  const safeImageInputs = Array.isArray(images)
    ? images.filter((img: unknown): img is string => typeof img === 'string' && (img.startsWith('data:image/') || /^https?:\/\//.test(img))).slice(0, 4)
    : null

  let persistedImages: string[] | null = null
  if (safeImageInputs) {
    try {
      persistedImages = await persistImages(safeImageInputs, `market/${session.user.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilder konnten nicht verarbeitet werden'
      const status = msg === 'Image too large' || msg === 'Unsupported image type' ? 400 : 500
      const mapped =
        msg === 'Image too large'
          ? 'Bild zu gross'
          : msg === 'Unsupported image type'
            ? 'Bildtyp nicht unterstuetzt'
            : msg === 'Media storage not configured'
              ? 'Medien-Speicher ist nicht konfiguriert'
              : 'Bilder konnten nicht verarbeitet werden'
      return NextResponse.json({ error: mapped }, { status })
    }
  }

  const updated = await prisma.partListing.update({
    where: { id },
    data: {
      title,
      description,
      price,
      condition,
      mileageOnCar: mileageOnCar === undefined ? undefined : mileageOnCar === null ? null : Math.floor(mileageOnCar),
      status,
      media: persistedImages
        ? {
            deleteMany: {},
            create: persistedImages.map((url) => ({
              type: 'IMAGE',
              url,
            })),
          }
        : undefined,
    },
    include: {
      media: { select: { id: true, url: true }, orderBy: { id: 'asc' } },
      modification: {
        select: {
          installedAt: true,
          installedMileage: true,
          removedAt: true,
          removedMileage: true,
          tuvStatus: true,
          documents: { select: { type: true } },
          approvalDocuments: { select: { approvalType: true } },
        },
      },
    },
  })

  const evidence = buildEvidence(updated as any)
  return NextResponse.json({
    listing: {
      ...updated,
      images: updated.media.map((m) => m.url),
      evidenceScore: evidence.score,
      evidenceTier: evidence.tier,
      evidenceBreakdown: evidence.breakdown,
    },
  })
}
