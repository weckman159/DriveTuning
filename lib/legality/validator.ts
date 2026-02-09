import 'server-only'

import { prisma } from '@/lib/prisma'
import { suggestTuningLegality, type ApprovalType } from '@/lib/tuning-legality-de'
import { getRegionalRules } from '@/lib/legality/regional-rules'
import { getLegalReferencesForRuleId } from '@/lib/legality/legal-references'

export type LegalityStatus =
  | 'UNKNOWN'
  | 'FULLY_LEGAL'
  | 'REGISTRATION_REQUIRED'
  | 'INSPECTION_REQUIRED'
  | 'ILLEGAL'

type ModificationInput = {
  id: string
  partName: string
  brand: string | null
  category: string
  tuvStatus: string
  userParametersJson?: string | null
  documents?: Array<{ type: string; url?: string | null; documentNumber?: string | null }> | null
  approvalDocuments?: Array<{ approvalType: string; approvalNumber?: string | null }> | null
  logEntry?: { car?: { stateId?: string | null } | null } | null
}

function norm(input: unknown): string {
  return typeof input === 'string' ? input.trim().toUpperCase() : ''
}

function normalizeApprovalNumberHint(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return null
  const compact = raw.replace(/\s+/g, '')
  if (/^\d{3,8}$/.test(compact)) return `KBA ${compact}`
  if (/^KBA\d{3,8}$/i.test(compact)) return `KBA ${compact.slice(3)}`
  return raw.replace(/\s+/g, ' ')
}

function extractApprovalNumberHints(mod: ModificationInput): string[] {
  const out: string[] = []

  const approvals = Array.isArray(mod.approvalDocuments) ? mod.approvalDocuments : []
  for (const a of approvals) {
    const v = normalizeApprovalNumberHint(a?.approvalNumber)
    if (v) out.push(v)
  }

  const docs = Array.isArray(mod.documents) ? mod.documents : []
  for (const d of docs) {
    const v = normalizeApprovalNumberHint(d?.documentNumber)
    if (v) out.push(v)
  }

  return Array.from(new Set(out.map((s) => s.trim()).filter(Boolean)))
}

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
  return undefined
}

const APPROVAL_EVIDENCE_TYPES = new Set(['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG', 'ECE'])
const STRONG_EVIDENCE_TYPES = ['EINTRAGUNG', 'EINZELABNAHME'] as const

function hasEvidenceType(mod: ModificationInput, type: string): boolean {
  const t = norm(type)
  const docs = Array.isArray(mod.documents) ? mod.documents : []
  const approvals = Array.isArray(mod.approvalDocuments) ? mod.approvalDocuments : []
  if (docs.some((d) => norm(d.type) === t)) return true
  if (approvals.some((a) => norm(a.approvalType) === t)) return true
  return false
}

function detectStrongEvidence(mod: ModificationInput): boolean {
  for (const t of STRONG_EVIDENCE_TYPES) {
    if (hasEvidenceType(mod, t)) return true
  }
  return false
}

function computeStatusFromRef(mod: ModificationInput, refApprovalType: ApprovalType | null): LegalityStatus {
  const tuv = norm(mod.tuvStatus)

  // If user marks it as registered (green), treat as legal unless contradicted.
  if (tuv === 'GREEN_REGISTERED') return 'FULLY_LEGAL'
  // If user marks it as racing-only, treat as not road-legal.
  if (tuv === 'RED_RACING') return 'ILLEGAL'

  if (detectStrongEvidence(mod)) return 'FULLY_LEGAL'

  if (!refApprovalType || refApprovalType === 'NONE') return 'UNKNOWN'

  if (refApprovalType === 'TEILEGUTACHTEN') {
    return 'REGISTRATION_REQUIRED'
  }
  if (refApprovalType === 'EINZELABNAHME_21' || refApprovalType === 'EINTRAGUNGSPFLICHTIG') {
    return 'INSPECTION_REQUIRED'
  }
  if (refApprovalType === 'ABE' || refApprovalType === 'ABG' || refApprovalType === 'ECE' || refApprovalType === 'EBE') {
    // If we have a matching evidence doc, treat as legal. Otherwise keep UNKNOWN but push user to add evidence.
    const want = refApprovalType === 'EBE' ? 'EBE' : refApprovalType
    if (hasEvidenceType(mod, want)) return 'FULLY_LEGAL'
    return 'UNKNOWN'
  }
  return 'UNKNOWN'
}

type Violation = {
  ruleId: string
  severity: 'info' | 'warning' | 'critical'
  messageDe: string
  messageEn: string
  legalReferences?: Array<{
    lawId: string
    lawNameDe: string
    lawNameEn: string
    lawUrl: string
    section: string
    notesDe?: string
    notesEn?: string
  }>
}

function safeJsonParseObject(input: string | null | undefined): Record<string, unknown> | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as any
    return null
  } catch {
    return null
  }
}

function parseNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function getNested(obj: Record<string, unknown> | null, key: string): unknown {
  if (!obj) return undefined
  return (obj as any)[key]
}

function validateAgainstCriticalParameters(input: {
  categoryId?: string
  userParameters: Record<string, unknown> | null
  criticalParameters: Record<string, unknown> | null
}): { violations: Violation[] } {
  const violations: Violation[] = []
  const up = input.userParameters || null
  const cp = input.criticalParameters || null

  const clearanceLoaded = parseNumberOrNull(getNested(up, 'clearanceLoaded'))
  const minClearanceLoaded = parseNumberOrNull(getNested(cp, 'minClearanceLoaded'))
  if (clearanceLoaded !== null && minClearanceLoaded !== null && clearanceLoaded < minClearanceLoaded) {
    violations.push({
      ruleId: 'min_clearance',
      severity: 'critical',
      messageDe: `Bodenfreiheit ${Math.round(clearanceLoaded)}mm < ${Math.round(minClearanceLoaded)}mm (beladen)`,
      messageEn: `Ground clearance ${Math.round(clearanceLoaded)}mm < ${Math.round(minClearanceLoaded)}mm (loaded)`,
    })
  }

  const trackWidthChange = parseNumberOrNull(getNested(up, 'trackWidthChange'))
  if (trackWidthChange !== null && trackWidthChange > 20) {
    violations.push({
      ruleId: 'track_width',
      severity: 'warning',
      messageDe: `Spurveraenderung +${Math.round(trackWidthChange)}mm > 20mm je Achse: Eintragung kann erforderlich sein`,
      messageEn: `Track change +${Math.round(trackWidthChange)}mm > 20mm per axle: registration may be required`,
    })
  }

  const et = parseNumberOrNull(getNested(up, 'et'))
  const etRange = getNested(cp, 'etRange')
  if (et !== null && Array.isArray(etRange) && etRange.length >= 2) {
    const minEt = parseNumberOrNull(etRange[0])
    const maxEt = parseNumberOrNull(etRange[1])
    if (minEt !== null && maxEt !== null && (et < minEt || et > maxEt)) {
      violations.push({
        ruleId: 'et_range',
        severity: 'warning',
        messageDe: `ET ${et} ausserhalb Referenz (${minEt}-${maxEt})`,
        messageEn: `ET ${et} outside reference (${minEt}-${maxEt})`,
      })
    }
  }

  const noiseLevelDb = parseNumberOrNull(getNested(up, 'noiseLevelDb'))
  const maxNoiseLevel = parseNumberOrNull(getNested(cp, 'maxNoiseLevel'))
  if (noiseLevelDb !== null && maxNoiseLevel !== null && noiseLevelDb > maxNoiseLevel) {
    violations.push({
      ruleId: 'noise',
      severity: 'critical',
      messageDe: `Geraeusch ${noiseLevelDb} dB > ${maxNoiseLevel} dB (Referenz)`,
      messageEn: `Noise ${noiseLevelDb} dB > ${maxNoiseLevel} dB (reference)`,
    })
  }

  return { violations }
}

function attachLegalReferences(violations: Violation[]) {
  for (const v of violations) {
    const refs = getLegalReferencesForRuleId(v.ruleId)
    if (refs.length) v.legalReferences = refs
  }
}

function extractCriticalParametersFromRestrictionsJson(restrictionsJson: string | null | undefined) {
  const raw = typeof restrictionsJson === 'string' ? restrictionsJson.trim() : ''
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const cp = parsed && typeof parsed === 'object' ? (parsed as any).criticalParameters : null
    if (cp && typeof cp === 'object' && !Array.isArray(cp)) return cp as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

export function assessModificationLegality(mod: ModificationInput): {
  legalityStatus: LegalityStatus
  legalityApprovalType: string | null
  legalityApprovalNumber: string | null
  legalitySourceId: string | null
  legalitySourceUrl: string | null
  legalityNotes: string | null
  violations: Violation[]
} {
  const brand = (mod.brand || '').trim()
  const q = `${brand} ${mod.partName}`.trim()
  const categoryId = mapModificationCategoryToDictionaryCategory(mod.category)

  const suggestions = suggestTuningLegality({ q, categoryId, limit: 3 })
  const best = suggestions[0]?.item || null

  const refApprovalType = (best?.approvalType || null) as ApprovalType | null
  let status = computeStatusFromRef(mod, refApprovalType)

  const notes: string[] = []
  if (refApprovalType && refApprovalType !== 'NONE') {
    notes.push(`Ref: ${refApprovalType}`)
  }
  if (refApprovalType === 'ABG') {
    notes.push('ABG is often vehicle/headlight specific; check Annex/vehicle list.')
  }
  if (refApprovalType === 'TEILEGUTACHTEN') {
    notes.push('Teilegutachten usually requires inspection and registration.')
  }
  if (refApprovalType === 'EINZELABNAHME_21') {
    notes.push('§21 individual approval is often required for combinations/deviations.')
  }

  // If there is evidence but no ref match, still surface evidence signal.
  const docs = Array.isArray(mod.documents) ? mod.documents : []
  const approvals = Array.isArray(mod.approvalDocuments) ? mod.approvalDocuments : []
  const evidenceTypes = new Set(
    [
      ...docs.map((d) => norm(d.type)).filter((t) => APPROVAL_EVIDENCE_TYPES.has(t)),
      ...approvals.map((a) => norm(a.approvalType)).filter((t) => APPROVAL_EVIDENCE_TYPES.has(t)),
    ].filter(Boolean)
  )
  if (!best && evidenceTypes.size) {
    notes.push(`Evidence: ${Array.from(evidenceTypes).join(', ')}`)
  }

  const userParams = safeJsonParseObject(mod.userParametersJson || null)
  const criticalParams = safeJsonParseObject((best as any)?.parameters ? JSON.stringify((best as any).parameters) : null)
  const validated = validateAgainstCriticalParameters({ categoryId, userParameters: userParams, criticalParameters: criticalParams })
  attachLegalReferences(validated.violations)
  if (validated.violations.some((v) => v.severity === 'critical')) {
    status = 'ILLEGAL'
  }

  return {
    legalityStatus: status,
    legalityApprovalType: best?.approvalType || null,
    legalityApprovalNumber: best?.approvalNumber || null,
    legalitySourceId: best?.sourceId || null,
    legalitySourceUrl: best?.sourceUrl || null,
    legalityNotes: notes.length ? notes.join(' ') : null,
    violations: validated.violations,
  }
}

export async function recomputeAndPersistModificationLegality(modificationId: string) {
  const mod = await prisma.modification.findUnique({
    where: { id: modificationId },
    select: {
      id: true,
      partName: true,
      brand: true,
      category: true,
      tuvStatus: true,
      userParametersJson: true,
      documents: { select: { type: true, url: true, documentNumber: true } },
      approvalDocuments: { select: { approvalType: true, approvalNumber: true } },
      logEntry: { select: { car: { select: { stateId: true } } } },
    },
  })
  if (!mod) return null

  const assessed = assessModificationLegality(mod as any)
  let extraViolations: Violation[] = []
  let linkedRefId: string | null = null
  let dbRefMatch: any = null
  try {
    const categoryId = mapModificationCategoryToDictionaryCategory(mod.category)

    // Prefer matching by approval number (user evidence / extracted ref), then fallback to brand+category.
    const hints = extractApprovalNumberHints(mod as any)
    const approvalHint = hints[0] || null

    if (approvalHint) {
      dbRefMatch = await prisma.legalityReference.findFirst({
        where: {
          approvalNumber: { contains: approvalHint, mode: 'insensitive' as any },
        } as any,
        orderBy: [{ isSynthetic: 'asc' }, { updatedAt: 'desc' }],
      })
    }

    if (!dbRefMatch) {
      dbRefMatch = await prisma.legalityReference.findFirst({
        where: {
          category: categoryId || undefined,
          brand: mod.brand ? { equals: mod.brand, mode: 'insensitive' as any } : undefined,
        } as any,
        orderBy: [{ isSynthetic: 'asc' }, { updatedAt: 'desc' }],
      })
    }

    if (dbRefMatch) {
      linkedRefId = dbRefMatch.id
      const cp = extractCriticalParametersFromRestrictionsJson(dbRefMatch.restrictionsJson)
      const up = safeJsonParseObject(mod.userParametersJson || null)
      const validated = validateAgainstCriticalParameters({ categoryId, userParameters: up, criticalParameters: cp })
      extraViolations = validated.violations
    }
  } catch {
    extraViolations = []
    linkedRefId = null
    dbRefMatch = null
  }

  const mergedViolations = [...(assessed.violations || []), ...extraViolations]

  try {
    const categoryId = mapModificationCategoryToDictionaryCategory(mod.category)
    const stateId = mod.logEntry?.car?.stateId || null
    const regional = getRegionalRules({ stateId, categoryId })
    for (const r of regional) {
      mergedViolations.push({
        ruleId: `regional_${r.id}`,
        severity: r.severity,
        messageDe: `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`,
        messageEn: `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`,
      })
    }
  } catch {
    // ignore regional rules errors in recompute (best-effort)
  }

  attachLegalReferences(mergedViolations)

  const finalStatus = mergedViolations.some((v) => v.severity === 'critical') ? 'ILLEGAL' : assessed.legalityStatus
  const updated = await prisma.modification.update({
    where: { id: mod.id },
    data: {
      legalityStatus: finalStatus,
      legalityApprovalType: assessed.legalityApprovalType || dbRefMatch?.approvalType || null,
      legalityApprovalNumber: assessed.legalityApprovalNumber || dbRefMatch?.approvalNumber || null,
      legalitySourceId: assessed.legalitySourceId || dbRefMatch?.sourceId || null,
      legalitySourceUrl: assessed.legalitySourceUrl || dbRefMatch?.sourceUrl || null,
      legalityNotes:
        mergedViolations && mergedViolations.length
          ? `${assessed.legalityNotes || ''} ${mergedViolations
               .filter((v) => v.severity !== 'info')
               .slice(0, 2)
               .map((v) => `[${v.ruleId}] ${v.messageDe}`)
               .join(' ')}`
               .trim()
          : assessed.legalityNotes,
      legalityLastCheckedAt: new Date(),
      legalityReferenceId: linkedRefId,
    },
  })

  // Keep marketplace listings in sync when a listing is linked to this modification.
  await prisma.partListing.updateMany({
    where: { modificationId: mod.id },
    data: {
      legalityStatus: updated.legalityStatus,
      legalityApprovalType: updated.legalityApprovalType,
      legalityApprovalNumber: updated.legalityApprovalNumber,
      legalitySourceId: updated.legalitySourceId,
      legalitySourceUrl: updated.legalitySourceUrl,
      legalityNotes: updated.legalityNotes,
      legalityLastCheckedAt: updated.legalityLastCheckedAt,
      isFullyLegal: updated.legalityStatus === 'FULLY_LEGAL',
      requiresRegistration: updated.legalityStatus === 'REGISTRATION_REQUIRED',
      requiresInspection: updated.legalityStatus === 'INSPECTION_REQUIRED',
    },
  })
  return updated
}
