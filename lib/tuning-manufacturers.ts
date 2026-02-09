import 'server-only'

import raw from '@/data/reference/tuning-manufacturers.json'

export type TuningManufacturerCategory =
  | 'wheels'
  | 'suspension'
  | 'exhaust'
  | 'brakes'
  | 'aero'
  | 'lighting'
  | 'ecu'
  | 'interior'
  | 'safety'
  | 'other'

export type ManufacturerApprovalSource = 'kba' | 'manufacturer' | 'community' | 'unknown'

export type TuningManufacturer = {
  id: string
  name: string
  country?: string | null
  website?: string | null
  categories: TuningManufacturerCategory[]
  approvalSources: ManufacturerApprovalSource[]
  abeDatabaseUrl?: string | null
  contactEmail?: string | null
  popularModels?: Array<{ name: string; category: TuningManufacturerCategory; typicalApproval: string }> | null
  aliases?: string[] | null
  notesDe?: string | null
  notesEn?: string | null
  dataQuality?: { verified?: boolean; notes?: string | null } | null
}

type Payload = {
  metadata: {
    version: string
    lastUpdated: string
    allowedCategories: string[]
    allowedApprovalSources: string[]
  }
  manufacturers: TuningManufacturer[]
}

const payload = raw as unknown as Payload

function norm(input: unknown): string {
  return typeof input === 'string' ? input.trim().toLowerCase() : ''
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function listTuningManufacturers(): TuningManufacturer[] {
  return safeArray<TuningManufacturer>((payload as any).manufacturers).filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string')
}

export function suggestTuningManufacturers(input: {
  q: string
  categoryId?: string | null
  country?: string | null
  limit?: number
}): Array<{ item: TuningManufacturer; score: number }> {
  const q = norm(input.q)
  const category = norm(input.categoryId)
  const country = norm(input.country)
  const limit = typeof input.limit === 'number' && Number.isFinite(input.limit) ? Math.max(1, Math.min(50, input.limit)) : 20

  let list = listTuningManufacturers()
  if (category) {
    list = list.filter((m) => safeArray<string>((m as any).categories).map((c) => norm(c)).includes(category))
  }
  if (country) {
    list = list.filter((m) => norm((m as any).country || '') === country)
  }

  if (!q) {
    return list.slice(0, limit).map((m, i) => ({ item: m, score: 1 / (1 + i) }))
  }

  const scored = list
    .map((m) => {
      const name = norm(m.name)
      const id = norm(m.id)
      const aliases = safeArray<string>((m as any).aliases).map(norm)
      const models = safeArray<any>((m as any).popularModels).map((p) => norm(p?.name))

      let score = 0
      if (name === q) score += 10
      if (id === q) score += 9
      if (name.includes(q)) score += 6
      if (aliases.some((a) => a === q)) score += 7
      if (aliases.some((a) => a.includes(q))) score += 4
      if (models.some((n) => n && n.includes(q))) score += 3

      return { item: m, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}

