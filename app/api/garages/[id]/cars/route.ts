import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImage } from '@/lib/image-storage'
import { slugify } from '@/lib/slug'
import { parseCarVisibility } from '@/lib/vocab'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id: garageId } = await params
  const body = await req.json()
  const { make, model, generation, year, projectGoal, currentMileage, heroImage } = body

  if (!make || !model || !projectGoal) {
    return NextResponse.json(
      { error: 'Hersteller, Modell und Projektziel sind erforderlich' },
      { status: 400 }
    )
  }

  const garage = await prisma.garage.findFirst({
    where: { id: garageId, userId: session.user.id },
  })

  if (!garage) {
    return NextResponse.json({ error: 'Garage nicht gefunden' }, { status: 404 })
  }

  const privacy = await prisma.userPrivacySettings.findUnique({
    where: { userId: session.user.id },
  })

  let persistedHeroImage: string | null = null
  if (typeof heroImage === 'string' && heroImage.startsWith('data:image/')) {
    try {
      persistedHeroImage = await persistImage(heroImage, `cars/${session.user.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bild konnte nicht verarbeitet werden'
      const status = msg === 'Image too large' || msg === 'Unsupported image type' ? 400 : 500
      const mapped =
        msg === 'Image too large'
          ? 'Bild zu gross'
          : msg === 'Unsupported image type'
            ? 'Bildtyp nicht unterstuetzt'
            : msg === 'Media storage not configured'
              ? 'Medien-Speicher ist nicht konfiguriert'
              : 'Bild konnte nicht verarbeitet werden'
      return NextResponse.json({ error: mapped }, { status })
    }
  }

  const baseSlug = slugify(
    [make, model, generation, year ? String(year) : null].filter(Boolean).join(' ')
  )

  // Ensure uniqueness for URLs like /build/[slug]
  let slug =
    baseSlug || `build-${Math.random().toString(36).slice(2, 8)}`
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`
    const exists = await prisma.car.findUnique({ where: { slug: candidate } })
    if (!exists) {
      slug = candidate
      break
    }
  }

  const car = await prisma.car.create({
    data: {
      garageId,
      slug,
      make,
      model,
      generation: generation || null,
      year: year ? Number(year) : null,
      projectGoal,
      currentMileage: currentMileage ? Number(currentMileage) : null,
      visibility: parseCarVisibility(privacy?.defaultCarVisibility) ?? 'UNLISTED',
      heroImage: persistedHeroImage,
    },
  })

  return NextResponse.json({ car }, { status: 201 })
}
