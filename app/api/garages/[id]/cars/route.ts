import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImage } from '@/lib/image-storage'
import { slugify } from '@/lib/slug'
import { parseCarVisibility } from '@/lib/vocab'
import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit'
import { upsertCarReference } from '@/lib/car-reference'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const bodySchema = z.object({
  make: z.string().trim().min(1).max(50),
  model: z.string().trim().min(1).max(80),
  generation: z.string().trim().max(30).optional().nullable(),
  bodyCode: z.string().trim().max(30).optional().nullable(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  transmission: z.string().trim().max(40).optional().nullable(),
  projectGoal: z.string().trim().min(1).max(30),
  currentMileage: z.coerce.number().int().min(0).max(2_000_000).optional().nullable(),
  heroImage: z.string().optional().nullable(),
  hsn: z.string().trim().max(10).optional().nullable(),
  tsn: z.string().trim().max(10).optional().nullable(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const rl = await consumeRateLimit({
    namespace: 'garages:cars:create:user',
    identifier: session.user.id,
    limit: 15,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Fahrzeuge in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const { id: garageId } = await params
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })
  }

  const { make, model, generation, bodyCode, year, transmission, projectGoal, currentMileage, heroImage, hsn, tsn } = parsed.data

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

  const ref = await upsertCarReference({
    make,
    model,
    generation: generation ?? null,
    bodyCode: bodyCode ?? null,
    hsn: hsn ?? null,
    tsn: tsn ?? null,
  })

  const car = await prisma.car.create({
    data: {
      garageId,
      slug,
      make,
      model,
      generation: generation || null,
      bodyCode: bodyCode || null,
      hsn: hsn || null,
      tsn: tsn || null,
      carVariantId: ref?.variant.id || null,
      year: year ?? null,
      transmission: transmission || null,
      projectGoal,
      currentMileage: currentMileage ?? null,
      visibility: parseCarVisibility(privacy?.defaultCarVisibility) ?? 'UNLISTED',
      heroImage: persistedHeroImage,
    },
  })

  return NextResponse.json({ car }, { status: 201 })
}
