import 'server-only'

import raw from '@/data/reference/tuning-legality-de.json'

export type ApprovalType =
  | 'NONE'
  | 'ABE'
  | 'ABG'
  | 'EBE'
  | 'TEILEGUTACHTEN'
  | 'EINZELABNAHME_21'
  | 'ECE'
  | 'EINTRAGUNGSPFLICHTIG'

export type TuningLegalityItem = {
  id?: string
  brand: string
  model: string
  categoryId?: string
  subcategoryId?: string
  approvalType: ApprovalType
  approvalNumber?: string | null
  sourceId: string
  sourceUrl?: string | null
  vehicleCompatibility?: string | null
  restrictions?: string[]
  validFrom?: string | null
  validUntil?: string | null
  notesDe?: string | null
  notesEn?: string | null
  parameters?: Record<string, string | number | boolean | null>
}

type TuningLegalitySubcategory = {
  id: string
  name: string
  nameDe: string
  approvalTypes: ApprovalType[]
  criticalParameters: string[]
  items: TuningLegalityItem[]
}

type TuningLegalityCategory = {
  id: string
  name: string
  nameDe: string
  subcategories: TuningLegalitySubcategory[]
}

type Payload = {
  country: 'DE'
  version: string
  lastUpdated: string
  categories: TuningLegalityCategory[]
  approvalTypeDefinitions: Record<string, unknown>
  approvalNumberPatterns?: Array<{ id: string; label: string; pattern: string }>
}

const payload = raw as unknown as Payload

function norm(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
}

function clampLimit(limit?: number) {
  const n = typeof limit === 'number' ? limit : 10
  return Math.max(1, Math.min(25, Math.floor(n)))
}

function flattenItems() {
  const out: TuningLegalityItem[] = []
  for (const cat of payload.categories || []) {
    for (const sub of cat.subcategories || []) {
      for (const it of sub.items || []) {
        out.push({
          ...it,
          categoryId: cat.id,
          subcategoryId: sub.id,
        })
      }
    }
  }
  return out
}

const ALL_ITEMS = flattenItems()

export function suggestTuningLegality(input: {
  q?: string
  limit?: number
  categoryId?: string
  subcategoryId?: string
  approvalNumber?: string
}): Array<{
  label: string
  value: string
  item: TuningLegalityItem
}> {
  const q = norm(input.q || '')
  const limit = clampLimit(input.limit)
  const categoryId = input.categoryId ? String(input.categoryId).trim() : ''
  const subcategoryId = input.subcategoryId ? String(input.subcategoryId).trim() : ''
  const approvalNumber = input.approvalNumber ? String(input.approvalNumber).trim() : ''

  let list = ALL_ITEMS.slice()
  if (categoryId) list = list.filter((i) => i.categoryId === categoryId)
  if (subcategoryId) list = list.filter((i) => i.subcategoryId === subcategoryId)
  if (approvalNumber) {
    const an = norm(approvalNumber)
    list = list.filter((i) => norm(i.approvalNumber || '').includes(an))
  }

  if (q) {
    list = list.filter((i) => {
      const hay = norm(`${i.brand} ${i.model} ${i.approvalNumber || ''} ${i.vehicleCompatibility || ''}`)
      return hay.includes(q)
    })
  }

  // Basic ranking: prefix match on brand/model first.
  list.sort((a, b) => {
    const aLabel = `${a.brand} ${a.model}`
    const bLabel = `${b.brand} ${b.model}`
    const ap = q && norm(aLabel).startsWith(q) ? 0 : 1
    const bp = q && norm(bLabel).startsWith(q) ? 0 : 1
    if (ap !== bp) return ap - bp
    return aLabel.localeCompare(bLabel, 'de', { sensitivity: 'base' })
  })

  return list.slice(0, limit).map((i) => ({
    label: `${i.brand} ${i.model}${i.approvalNumber ? ` · ${i.approvalNumber}` : ''}`,
    value: `${i.brand} ${i.model}`,
    item: i,
  }))
}

export function listTuningLegalityCategories() {
  return (payload.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    nameDe: c.nameDe,
    subcategories: (c.subcategories || []).map((s) => ({
      id: s.id,
      name: s.name,
      nameDe: s.nameDe,
      approvalTypes: s.approvalTypes,
      criticalParameters: s.criticalParameters,
    })),
  }))
}

export function findApprovalNumberPatterns() {
  return Array.isArray(payload.approvalNumberPatterns) ? payload.approvalNumberPatterns : []
}
