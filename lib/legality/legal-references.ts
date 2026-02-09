import 'server-only'

import framework from '@/data/reference/german-legal-framework.json'

export type LegalReference = {
  lawId: string
  lawNameDe: string
  lawNameEn: string
  lawUrl: string
  section: string
  notesDe?: string
  notesEn?: string
}

type FrameworkLaw = {
  id: string
  nameDe: string
  nameEn: string
  url: string
}

type FrameworkRef = {
  lawId: string
  section: string
  notesDe?: string
  notesEn?: string
}

type FrameworkRule = {
  ruleId: string
  refs: FrameworkRef[]
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

const lawsById = new Map<string, FrameworkLaw>()
for (const l of safeArray<FrameworkLaw>((framework as any).laws)) {
  if (!l || typeof l.id !== 'string') continue
  lawsById.set(l.id, l)
}

const refsByRuleId = new Map<string, FrameworkRef[]>()
for (const r of safeArray<FrameworkRule>((framework as any).ruleIdReferences)) {
  if (!r || typeof r.ruleId !== 'string') continue
  const refs = safeArray<FrameworkRef>((r as any).refs).filter((x) => x && typeof x.lawId === 'string' && typeof x.section === 'string')
  refsByRuleId.set(r.ruleId, refs)
}

function normalizeRuleId(ruleId: string): string {
  const raw = String(ruleId || '').trim()
  if (!raw) return ''
  if (raw.startsWith('regional_')) return 'regional'
  return raw
}

export function getLegalReferencesForRuleId(ruleId: string): LegalReference[] {
  const key = normalizeRuleId(ruleId)
  if (!key) return []

  const refs = refsByRuleId.get(key) || []
  if (!refs.length) return []

  const out: LegalReference[] = []
  for (const ref of refs) {
    const law = lawsById.get(ref.lawId)
    if (!law) continue
    out.push({
      lawId: law.id,
      lawNameDe: law.nameDe,
      lawNameEn: law.nameEn,
      lawUrl: law.url,
      section: ref.section,
      notesDe: ref.notesDe,
      notesEn: ref.notesEn,
    })
  }
  return out
}

