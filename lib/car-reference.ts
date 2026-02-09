import 'server-only'

import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function norm(input: unknown): string {
  return typeof input === 'string' ? input.trim() : ''
}

export async function upsertCarReference(input: {
  make: string
  model: string
  generation?: string | null
  bodyCode?: string | null
  engineCode?: string | null
  hsn?: string | null
  tsn?: string | null
}) {
  const make = norm(input.make)
  const model = norm(input.model)
  if (!make || !model) return null

  const generation = norm(input.generation) || null
  const bodyCode = norm(input.bodyCode) || null
  const engineCode = norm(input.engineCode) || null
  const hsn = norm(input.hsn) || null
  const tsn = norm(input.tsn) || null

  const brand = await prisma.brand.upsert({
    where: { name: make },
    create: { name: make },
    update: {},
    select: { id: true, name: true },
  })

  const carModel = await prisma.carModel.upsert({
    where: { brandId_name: { brandId: brand.id, name: model } },
    create: { brandId: brand.id, name: model },
    update: {},
    select: { id: true, name: true, brandId: true },
  })

  const fingerprint = sha256(
    [
      brand.id,
      carModel.id,
      generation || '',
      bodyCode || '',
      engineCode || '',
      hsn || '',
      tsn || '',
    ].join('|')
  )

  const variant = await prisma.carVariant.upsert({
    where: { fingerprint },
    create: {
      carModelId: carModel.id,
      fingerprint,
      generation,
      bodyCode,
      engineCode,
      hsn,
      tsn,
    },
    update: {
      generation,
      bodyCode,
      engineCode,
      hsn,
      tsn,
    },
    select: { id: true, fingerprint: true },
  })

  return { brand, carModel, variant }
}

