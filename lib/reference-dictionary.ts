import 'server-only'

import raw from '@/data/reference/dictionary.json'

export type DictionaryType = 'car_make' | 'car_model' | 'brand'

export type DictionarySuggestion = {
  label: string
  value: string
}

type ReferenceDictionary = {
  carMakes: string[]
  brands: string[]
  carModelsByMake: Record<string, string[]>
  carYearsByMakeModel: Record<string, Record<string, string>>
  carYearsListByMakeModel?: Record<string, Record<string, number[]>>
  carVariantsByMakeModel?: Record<
    string,
    Record<
      string,
      Array<{
        years: string | null
        bodyCode?: string | null
        engineLiters: number | null
        fuel: string | null
        powerPs: number | null
        batteryKwh: number | null
      }>
    >
  >
}

const dict = raw as unknown as ReferenceDictionary

function norm(input: string) {
  return input
    .trim()
    .toLowerCase()
    // Make search accent-insensitive (e.g. "S" matches "Š").
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Common transliteration for German sharp s.
    .replace(/ß/g, 'ss')
}

function extractYearNumbers(input: string) {
  const out: number[] = []
  const re = /(\d{4})/g
  let m: RegExpExecArray | null = null
  while ((m = re.exec(input))) {
    const n = Number(m[1])
    if (!Number.isFinite(n)) continue
    out.push(n)
  }
  return out
}

function yearsFromLabel(label: string) {
  const cleaned = (label || '').trim()
  if (!cleaned) return [] as number[]

  const nums = extractYearNumbers(cleaned)
  const nowYear = new Date().getFullYear()

  // e.g. "2020–н.в." => treat as start..now
  if (nums.length === 1) {
    const start = nums[0]
    const end = Math.max(start, Math.min(nowYear, start + 120))
    if (start < 1900 || start > nowYear + 1) return []
    const out: number[] = []
    for (let y = start; y <= end; y++) out.push(y)
    return out
  }

  if (nums.length >= 2) {
    const start = Math.min(nums[0], nums[1])
    const rawEnd = Math.max(nums[0], nums[1])
    const end = Math.min(rawEnd, nowYear)
    if (start < 1900 || start > nowYear + 1) return []
    if (end < start) return []
    if (end - start > 120) return []
    const out: number[] = []
    for (let y = start; y <= end; y++) out.push(y)
    return out
  }

  return []
}

function inferCodesFromModel(model: string) {
  const m = (model || '').trim()
  if (!m) return { generation: null as string | null, bodyCode: null as string | null }

  // Common chassis/body codes: BMW (E/F/G), Mercedes (W/C/V/R)
  const bodyMatch = m.match(/\b([EFG]\d{2,3}|W\d{3}|C\d{3}|V\d{3}|R\d{3})\b/i)
  // VAG-ish generation tags: B6/B7/B8...
  const vagMatch = m.match(/\b(B\d{1,2})\b/i)
  // Roman numerals at end: Golf IV, etc.
  const romanMatch = m.match(/\b([IVX]{1,5})\b$/i)

  const bodyCode = bodyMatch ? bodyMatch[1].toUpperCase() : null
  const generation = vagMatch
    ? vagMatch[1].toUpperCase()
    : romanMatch
      ? romanMatch[1].toUpperCase()
      : bodyCode
        ? bodyCode
        : null

  return { generation, bodyCode }
}

function uniqByValue(items: DictionarySuggestion[]) {
  const seen = new Set<string>()
  const out: DictionarySuggestion[] = []
  for (const it of items) {
    const key = norm(it.value)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function compareByRelevance(a: string, b: string, q: string) {
  const qa = norm(q)
  const an = norm(a)
  const bn = norm(b)

  const ai = qa ? an.indexOf(qa) : 0
  const bi = qa ? bn.indexOf(qa) : 0

  // Prefer prefix matches, then earlier substring matches.
  const ap = ai === 0 ? 0 : 1
  const bp = bi === 0 ? 0 : 1
  if (ap !== bp) return ap - bp

  const aidx = ai < 0 ? 9999 : ai
  const bidx = bi < 0 ? 9999 : bi
  if (aidx !== bidx) return aidx - bidx

  // Prefer shorter strings (usually more exact).
  if (an.length !== bn.length) return an.length - bn.length

  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

export function suggestFromReferenceDictionary(input: {
  type: DictionaryType
  q: string
  make?: string
  limit?: number
}): DictionarySuggestion[] {
  const q = norm(input.q || '')
  const limit = Math.max(1, Math.min(25, Math.floor(input.limit ?? 10)))

  if (input.type === 'car_make') {
    if (!q) return []
    return dict.carMakes
      .filter((v) => norm(v).includes(q))
      .slice()
      .sort((a, b) => compareByRelevance(a, b, q))
      .slice(0, limit)
      .map((v) => ({ label: v, value: v }))
  }

  if (input.type === 'brand') {
    if (!q) return []
    return dict.brands
      .filter((v) => norm(v).includes(q))
      .slice()
      .sort((a, b) => compareByRelevance(a, b, q))
      .slice(0, limit)
      .map((v) => ({ label: v, value: v }))
  }

  // car_model
  const make = typeof input.make === 'string' ? input.make.trim() : ''
  const yearsByMakeModel = dict.carYearsByMakeModel || {}

  if (make && dict.carModelsByMake[make]) {
    const models = dict.carModelsByMake[make].slice()
    const years = yearsByMakeModel[make] || {}
    const filtered = models.filter((m) => (!q ? true : norm(m).includes(q)))
    filtered.sort((a, b) => compareByRelevance(a, b, q))
    return filtered
      .slice(0, limit)
      .map((m) => {
        const y = years[m]
        return { label: y ? `${m} · ${y}` : m, value: m }
      })
  }

  if (!q) return []

  const out: DictionarySuggestion[] = []
  for (const [mk, models] of Object.entries(dict.carModelsByMake)) {
    const years = yearsByMakeModel[mk] || {}
    for (const m of models) {
      if (!norm(m).includes(q)) continue
      const y = years[m]
      out.push({
        label: y ? `${mk} ${m} · ${y}` : `${mk} ${m}`,
        value: m,
      })
      if (out.length >= limit * 3) break
    }
    if (out.length >= limit * 3) break
  }

  const unique = uniqByValue(out)
  unique.sort((a, b) => compareByRelevance(a.value, b.value, q))
  return unique.slice(0, limit)
}

export function getCarMetaFromReferenceDictionary(input: { make: string; model: string }) {
  const make = (input.make || '').trim()
  const model = (input.model || '').trim()

  const yearsLabel =
    make && model && dict.carYearsByMakeModel && dict.carYearsByMakeModel[make]
      ? dict.carYearsByMakeModel[make][model]
      : undefined

  const yearsFromList =
    make && model && dict.carYearsListByMakeModel && dict.carYearsListByMakeModel[make]
      ? dict.carYearsListByMakeModel[make][model]
      : undefined

  const years =
    Array.isArray(yearsFromList) && yearsFromList.length > 0
      ? yearsFromList
      : yearsLabel
        ? yearsFromLabel(yearsLabel)
        : []
  const inferred = inferCodesFromModel(model)
  const variants = getCarVariantsFromReferenceDictionary({ make, model })
  const bodyCodes = Array.from(
    new Set(
      variants
        .map((v) => (typeof v.bodyCode === 'string' ? v.bodyCode.trim() : ''))
        .filter(Boolean)
        .map((v) => v.toUpperCase())
    )
  ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))

  const inferredBodyCode =
    bodyCodes.length === 1 ? bodyCodes[0] : inferred.bodyCode

  return {
    yearsLabel: yearsLabel || null,
    years,
    inferredGeneration: inferred.generation,
    inferredBodyCode,
    bodyCodes,
  }
}

export function getCarVariantsFromReferenceDictionary(input: { make: string; model: string }) {
  const make = (input.make || '').trim()
  const model = (input.model || '').trim()

  const variants =
    make && model && dict.carVariantsByMakeModel && dict.carVariantsByMakeModel[make]
      ? dict.carVariantsByMakeModel[make][model]
      : undefined

  return Array.isArray(variants) ? variants : []
}
