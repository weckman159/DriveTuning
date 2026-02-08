import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImages } from '@/lib/image-storage'
import { calculateEvidenceScore } from '@/lib/provenance'
import { parseListingCondition } from '@/lib/vocab'
import { NextResponse } from 'next/server'

function buildEvidenceScore(listing: {
  media: { url: string }[]
  modification: {
    evidenceScore: number
    installedMileage: number | null
    removedMileage: number | null
    price: number | null
    tuvStatus: string
    documents: { id: string }[]
  } | null
}) {
  if (!listing.modification) return 0
  if (listing.modification.evidenceScore > 0) return listing.modification.evidenceScore

  return calculateEvidenceScore({
    hasInstalledPhoto: listing.media.length > 0,
    hasInstalledMileage: listing.modification.installedMileage !== null,
    hasRemovedMileage: listing.modification.removedMileage !== null,
    hasPrice: listing.modification.price !== null,
    documentCount: listing.modification.documents.length,
    hasTuvStatus: Boolean(listing.modification.tuvStatus),
  })
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
  const numericPrice = Number((body as any).price)
  const condition = parseListingCondition((body as any).condition)
  const mileageOnCarRaw = (body as any).mileageOnCar
  const modificationIdRaw = (body as any).modificationId
  const images = (body as any).images
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
  if (typeof modificationIdRaw === 'string' && modificationIdRaw.trim()) {
    modificationId = modificationIdRaw.trim()
    const mod = await prisma.modification.findFirst({
      where: {
        id: modificationId,
        logEntry: { car: { garage: { userId: session.user.id } } },
      },
      select: { id: true, logEntry: { select: { carId: true } } },
    })

    if (!mod) {
      return NextResponse.json({ error: 'Ungueltige modificationId' }, { status: 400 })
    }

    carId = mod.logEntry.carId
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
        car: { select: { id: true, make: true, model: true, generation: true } },
        modification: {
          select: {
            id: true,
            partName: true,
            brand: true,
            category: true,
            tuvStatus: true,
            installedMileage: true,
            removedMileage: true,
            price: true,
            evidenceScore: true,
            documents: { select: { id: true } },
          },
        },
        media: { select: { url: true }, orderBy: { id: 'asc' } },
      },
    })

    return NextResponse.json({
      listing: {
        ...listing,
        images: listing.media.map((m) => m.url),
        evidenceScore: buildEvidenceScore(listing),
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

export async function GET() {
  const listings = await prisma.partListing.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      seller: { select: { id: true, name: true } },
      car: { select: { id: true, make: true, model: true, generation: true } },
      modification: {
        select: {
          id: true,
          partName: true,
          brand: true,
          category: true,
          tuvStatus: true,
          installedMileage: true,
          removedMileage: true,
          price: true,
          evidenceScore: true,
          documents: { select: { id: true } },
        },
      },
      media: { select: { url: true }, orderBy: { id: 'asc' } },
    },
  })

  return NextResponse.json({
    listings: listings.map((listing) => ({
      ...listing,
      images: listing.media.map((m) => m.url),
      evidenceScore: buildEvidenceScore(listing),
    })),
  })
}

