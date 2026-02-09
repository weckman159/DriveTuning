import { NextResponse } from 'next/server'
import { getRegionalRules } from '@/lib/legality/regional-rules'

function mapModificationCategoryToDictionaryCategory(category?: string | null) {
  const c = String(category || '').trim().toUpperCase()
  if (c === 'AERO') return 'aero'
  if (c === 'BRAKES') return 'brakes'
  if (c === 'WHEELS') return 'wheels'
  if (c === 'SUSPENSION') return 'suspension'
  if (c === 'EXHAUST') return 'exhaust'
  if (c === 'LIGHTING') return 'lighting'
  if (c === 'ECU') return 'ecu'
  if (c === 'ENGINE') return 'ecu'
  if (c === 'INTERIOR') return 'interior'
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const stateId = searchParams.get('stateId')
  const catsRaw = searchParams.get('categories')
  const categories = catsRaw ? catsRaw.split(',').map((c) => c.trim()).filter(Boolean) : []

  const rules =
    categories.length > 0
      ? categories.flatMap((c) => getRegionalRules({ stateId, categoryId: mapModificationCategoryToDictionaryCategory(c) || c.toLowerCase() }))
      : getRegionalRules({ stateId, categoryId: null })

  const uniq = new Map<string, any>()
  for (const r of rules) {
    if (r && r.id && !uniq.has(r.id)) uniq.set(r.id, r)
  }
  const list = Array.from(uniq.values())

  return NextResponse.json({
    stateId: stateId ? String(stateId).trim().toUpperCase() : null,
    count: list.length,
    criticalCount: list.filter((r) => r.severity === 'critical').length,
    warnings: list.map((r) => `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`),
    rules: list,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any))
  const stateId = (body as any).stateId
  const modificationCategories = Array.isArray((body as any).modificationCategories) ? (body as any).modificationCategories : []

  const cats = modificationCategories
    .map((c: any) => mapModificationCategoryToDictionaryCategory(typeof c === 'string' ? c : null))
    .filter(Boolean) as string[]

  const rules =
    cats.length > 0 ? cats.flatMap((cat) => getRegionalRules({ stateId, categoryId: cat })) : getRegionalRules({ stateId, categoryId: null })

  const uniq = new Map<string, any>()
  for (const r of rules) {
    if (r && r.id && !uniq.has(r.id)) uniq.set(r.id, r)
  }
  const list = Array.from(uniq.values())

  return NextResponse.json({
    stateId: stateId ? String(stateId).trim().toUpperCase() : null,
    count: list.length,
    criticalCount: list.filter((r) => r.severity === 'critical').length,
    warnings: list.map((r) => `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`),
    rules: list,
  })
}

