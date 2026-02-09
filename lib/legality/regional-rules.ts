import 'server-only'

import raw from '@/data/reference/germany-regional-rules.json'

type Severity = 'info' | 'warning' | 'critical'

type Rule = {
  id: string
  stateId: string
  nameDe: string
  descriptionDe: string
  affectedCategories: string[]
  severity: Severity
  sourceUrl?: string | null
  validFrom?: string | null
  validUntil?: string | null
}

type Payload = {
  version: string
  country: 'DE'
  rules: Rule[]
}

const payload = raw as unknown as Payload

export function getRegionalRules(input: { stateId?: string | null; categoryId?: string | null }) {
  const stateId = String(input.stateId || '').trim().toUpperCase()
  const categoryId = String(input.categoryId || '').trim().toLowerCase()
  if (!stateId) return []
  const now = Date.now()

  return (payload.rules || []).filter((r) => {
    if (String(r.stateId || '').toUpperCase() !== stateId) return false
    if (categoryId) {
      const cats = Array.isArray(r.affectedCategories) ? r.affectedCategories : []
      if (!cats.map((c) => String(c || '').toLowerCase()).includes(categoryId)) return false
    }
    const validUntil = r.validUntil ? new Date(r.validUntil).getTime() : null
    if (validUntil !== null && Number.isFinite(validUntil) && validUntil < now) return false
    return true
  })
}

