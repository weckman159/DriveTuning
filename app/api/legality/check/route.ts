import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { suggestTuningLegality, type ApprovalType } from '@/lib/tuning-legality-de'
import { getRegionalRules } from '@/lib/legality/regional-rules'
import { getLegalReferencesForRuleId } from '@/lib/legality/legal-references'

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

function attachLegalReferences(violations: Violation[]) {
  for (const v of violations) {
    const refs = getLegalReferencesForRuleId(v.ruleId)
    if (refs.length) v.legalReferences = refs
  }
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

function parseNumberOrNull(value: string | null): number | null {
  if (value === null) return null
  const raw = String(value || '').trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function normalizeApprovalNumberForQuery(input: string | null) {
  const raw = String(input || '').trim()
  if (!raw) return null
  const compact = raw.replace(/\s+/g, '')
  // If user entered only digits, treat as KBA digits.
  if (/^\d{3,8}$/.test(compact)) return { raw, normalized: `KBA ${compact}`, digits: compact }
  // KBA43234 -> KBA 43234
  if (/^KBA\d{3,8}$/i.test(compact)) {
    const digits = compact.slice(3)
    return { raw, normalized: `KBA ${digits}`, digits }
  }
  const digits = raw.replace(/[^0-9]/g, '')
  return { raw, normalized: raw.replace(/\s+/g, ' '), digits: digits || null }
}

function validateAgainstCriticalParameters(input: {
  userParameters: Record<string, number>
  criticalParameters: Record<string, unknown> | null
}): Violation[] {
  const violations: Violation[] = []
  const cp = input.criticalParameters || null
  const up = input.userParameters

  const clearanceLoaded = up.clearanceLoaded
  const minClearanceLoaded =
    cp && typeof (cp as any).minClearanceLoaded === 'number' ? (cp as any).minClearanceLoaded : null
  if (clearanceLoaded !== undefined && minClearanceLoaded !== null && clearanceLoaded < minClearanceLoaded) {
    violations.push({
      ruleId: 'min_clearance',
      severity: 'critical',
      messageDe: `Bodenfreiheit ${Math.round(clearanceLoaded)}mm < ${Math.round(minClearanceLoaded)}mm (beladen)`,
      messageEn: `Ground clearance ${Math.round(clearanceLoaded)}mm < ${Math.round(minClearanceLoaded)}mm (loaded)`,
    })
  }

  const trackWidthChange = up.trackWidthChange
  if (trackWidthChange !== undefined && trackWidthChange > 20) {
    violations.push({
      ruleId: 'track_width',
      severity: 'warning',
      messageDe: `Spurveraenderung +${Math.round(trackWidthChange)}mm > 20mm je Achse: Eintragung kann erforderlich sein`,
      messageEn: `Track change +${Math.round(trackWidthChange)}mm > 20mm per axle: registration may be required`,
    })
  }

  const et = up.et
  const etRange = cp && Array.isArray((cp as any).etRange) ? ((cp as any).etRange as any[]) : null
  if (et !== undefined && etRange && etRange.length >= 2) {
    const minEt = typeof etRange[0] === 'number' ? etRange[0] : null
    const maxEt = typeof etRange[1] === 'number' ? etRange[1] : null
    if (minEt !== null && maxEt !== null && (et < minEt || et > maxEt)) {
      violations.push({
        ruleId: 'et_range',
        severity: 'warning',
        messageDe: `ET ${et} ausserhalb Referenz (${minEt}-${maxEt})`,
        messageEn: `ET ${et} outside reference (${minEt}-${maxEt})`,
      })
    }
  }

  const noiseLevelDb = up.noiseLevelDb
  const maxNoiseLevel = cp && typeof (cp as any).maxNoiseLevel === 'number' ? (cp as any).maxNoiseLevel : null
  if (noiseLevelDb !== undefined && maxNoiseLevel !== null && noiseLevelDb > maxNoiseLevel) {
    violations.push({
      ruleId: 'noise',
      severity: 'critical',
      messageDe: `Geraeusch ${noiseLevelDb} dB > ${maxNoiseLevel} dB (Referenz)`,
      messageEn: `Noise ${noiseLevelDb} dB > ${maxNoiseLevel} dB (reference)`,
    })
  }

  return violations
}

function computeNextSteps(approvalType: ApprovalType | undefined) {
  switch (approvalType) {
    case 'ABE':
      return [
        'ABE lesen und alle Auflagen einhalten.',
        'Dokument als Nachweis in DriveTuning hochladen (PDF/Foto).',
      ]
    case 'ABG':
      return [
        'ABG herunterladen, ausdrucken und ggf. mitfuehren (je nach Auflagen).',
        'Pruefen, ob dein Fahrzeug/Dein Scheinwerfertyp in der Liste/Anlage enthalten ist.',
        'Dokument als Nachweis in DriveTuning hochladen (PDF/Foto).',
      ]
    case 'ECE':
      return [
        'E-Kennzeichnung am Teil pruefen (E1/E4 usw.) und Einbauhinweise befolgen.',
        'Falls zusaetzliche Auflagen gelten: Nachweis/Dokumentation speichern.',
      ]
    case 'TEILEGUTACHTEN':
      return [
        'Teilegutachten bereit halten (PDF/Scan).',
        'Aenderungsabnahme (z.B. TUEV/DEKRA/GTUE) und anschliessend Eintragung, falls gefordert.',
        'Nachweis (Gutachten + Eintragung) in DriveTuning speichern.',
      ]
    case 'EINZELABNAHME_21':
      return [
        'Einzelabnahme nach §21 mit Prueforganisation klaeren (Unterlagen, Messungen, Kombinationswirkung).',
        'Ergebnisdokument (Gutachten/Eintragung) als Nachweis speichern.',
      ]
    case 'EINTRAGUNGSPFLICHTIG':
      return [
        'Ohne passende Dokumente: Eintragung/Abnahme erforderlich.',
        'Vor Umbau mit Prueforganisation abstimmen und Nachweise sammeln.',
      ]
    default:
      return [
        'Nachweisart (ABE/ABG/Teilegutachten/ECE/§21) klaeren.',
        'Wenn du Dokumente hast: als Nachweis hochladen.',
      ]
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || ''
  const partName = searchParams.get('partName') || ''
  const category = searchParams.get('category')
  const approvalNumber = searchParams.get('approvalNumber')
  const make = searchParams.get('make')
  const model = searchParams.get('model')
  const year = searchParams.get('year')
  const stateId = searchParams.get('stateId')

  const userParameters: Record<string, number> = {}
  const et = parseNumberOrNull(searchParams.get('et'))
  const trackWidthChange = parseNumberOrNull(searchParams.get('trackWidthChange'))
  const clearanceLoaded = parseNumberOrNull(searchParams.get('clearanceLoaded'))
  const noiseLevelDb = parseNumberOrNull(searchParams.get('noiseLevelDb'))
  if (et !== null) userParameters.et = et
  if (trackWidthChange !== null) userParameters.trackWidthChange = trackWidthChange
  if (clearanceLoaded !== null) userParameters.clearanceLoaded = clearanceLoaded
  if (noiseLevelDb !== null) userParameters.noiseLevelDb = noiseLevelDb

  if (!brand.trim() || !partName.trim()) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const warnings: string[] = []

  const q = `${brand} ${partName}`.trim()
  const categoryId = mapModificationCategoryToDictionaryCategory(category)

  const suggestions = suggestTuningLegality({
    q,
    categoryId,
    approvalNumber: approvalNumber || undefined,
    limit: 5,
  })

  // Optional coarse compatibility filter. This is intentionally conservative and will not exclude
  // items without explicit compatibility strings.
  const filtered = suggestions.filter((s) => {
    const vc = String(s.item.vehicleCompatibility || '')
    if (!vc) return true
    const hay = vc.toLowerCase()
    const mk = make ? make.toLowerCase() : ''
    const md = model ? model.toLowerCase() : ''
    const yr = year ? String(year).toLowerCase() : ''
    if (mk && !hay.includes(mk)) return false
    if (md && !hay.includes(md)) return false
    if (yr && !hay.includes(yr)) return true
    return true
  })

  const bestMatch = filtered[0] || suggestions[0] || null
  const dictionaryApprovalType = bestMatch?.item?.approvalType

  let dbMatches: any[] = []
  try {
    const byApproval = normalizeApprovalNumberForQuery(approvalNumber)

    const hits: any[] = []

    if (byApproval?.normalized || byApproval?.digits) {
      const approvalWhere: any = {
        approvalNumber: {
          contains: (byApproval.normalized || byApproval.digits || '').trim(),
          mode: 'insensitive',
        },
      }
      // If caller provided a category, keep it as a hint but do not require it.
      if (categoryId) {
        approvalWhere.OR = [{ category: categoryId }, { category: null }, { category: 'other' }]
      }
      const byNum = await prisma.legalityReference.findMany({
        where: approvalWhere,
        orderBy: [{ isSynthetic: 'asc' }, { updatedAt: 'desc' }],
        take: 10,
      })
      hits.push(...(Array.isArray(byNum) ? byNum : []))
    }

    const byBrand = await prisma.legalityReference.findMany({
      where: {
        category: categoryId || undefined,
        brand: brand.trim() ? { equals: brand.trim() } : undefined,
      },
      orderBy: [{ isSynthetic: 'asc' }, { updatedAt: 'desc' }],
      take: 10,
    })
    hits.push(...(Array.isArray(byBrand) ? byBrand : []))

    const uniq = new Map<string, any>()
    for (const r of hits) {
      if (r && r.id && !uniq.has(r.id)) uniq.set(r.id, r)
    }

    // Prisma SQLite case-sensitivity differs; do a second-pass filter in JS.
    const pn = partName.trim().toLowerCase()
    const b = brand.trim().toLowerCase()
    dbMatches = Array.from(uniq.values()).filter((r) => {
      const partOk = pn ? String(r.partName || '').toLowerCase().includes(pn) : true
      const brandOk = b ? String(r.brand || '').toLowerCase().includes(b) : true
      return partOk && brandOk
    })
    dbMatches = dbMatches.slice(0, 5)
  } catch {
    dbMatches = []
  }

  const dbApprovalType = dbMatches[0]?.approvalType as ApprovalType | undefined
  const effectiveApprovalType: ApprovalType | undefined = dictionaryApprovalType ?? dbApprovalType

  let violations: Violation[] = []
  if (Object.keys(userParameters).length) {
    // Prefer DB criticalParameters if present (seed), otherwise fallback to dictionary parameters.
    let criticalParameters: Record<string, unknown> | null = null
    const firstDb = dbMatches[0]
    if (firstDb && typeof firstDb.restrictionsJson === 'string' && firstDb.restrictionsJson.trim()) {
      try {
        const parsed = JSON.parse(firstDb.restrictionsJson)
        if (parsed && typeof parsed === 'object') {
          const cp = (parsed as any).criticalParameters
          if (cp && typeof cp === 'object' && !Array.isArray(cp)) criticalParameters = cp as any
        }
      } catch {
        criticalParameters = null
      }
    }
    if (!criticalParameters && bestMatch?.item && (bestMatch.item as any).parameters) {
      const cp = (bestMatch.item as any).parameters
      if (cp && typeof cp === 'object' && !Array.isArray(cp)) criticalParameters = cp as any
    }
    violations = validateAgainstCriticalParameters({ userParameters, criticalParameters })
  }
  attachLegalReferences(violations)

  let legalityStatus:
    | 'UNKNOWN'
    | 'FULLY_LEGAL'
    | 'REGISTRATION_REQUIRED'
    | 'INSPECTION_REQUIRED'
    | 'ILLEGAL' = violations.some((v) => v.severity === 'critical')
    ? 'ILLEGAL'
    : effectiveApprovalType === 'TEILEGUTACHTEN'
      ? 'REGISTRATION_REQUIRED'
      : effectiveApprovalType === 'EINZELABNAHME_21' || effectiveApprovalType === 'EINTRAGUNGSPFLICHTIG'
        ? 'INSPECTION_REQUIRED'
        : effectiveApprovalType === 'ABE' ||
            effectiveApprovalType === 'ABG' ||
            effectiveApprovalType === 'ECE' ||
            effectiveApprovalType === 'EBE'
          ? 'FULLY_LEGAL'
          : 'UNKNOWN'

  const regionalRules = getRegionalRules({ stateId, categoryId })
  for (const r of regionalRules) {
    warnings.push(`[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`)
    if (r.severity === 'critical') {
      violations.push({
        ruleId: `regional_${r.id}`,
        severity: 'critical',
        messageDe: `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`,
        messageEn: `[${r.stateId}] ${r.nameDe}: ${r.descriptionDe}`,
      })
    }
  }
  attachLegalReferences(violations)

  if (violations.some((v) => v.severity === 'critical')) {
    legalityStatus = 'ILLEGAL'
  }

  let communityProofs: any[] = []
  try {
    const comm = await prisma.legalityContribution.findMany({
      where: {
        status: 'APPROVED',
        modification: {
          brand: brand.trim() ? { equals: brand.trim() } : undefined,
        },
      },
      orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        approvalType: true,
        approvalNumber: true,
        inspectionOrg: true,
        inspectionDate: true,
        notes: true,
        isAnonymous: true,
        hasDocuments: true,
        createdAt: true,
        modification: { select: { partName: true, brand: true } },
      },
    })

    const pn = partName.trim().toLowerCase()
    communityProofs = (Array.isArray(comm) ? comm : [])
      .filter((c) => String(c.modification?.partName || '').toLowerCase().includes(pn))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        approvalType: c.approvalType,
        approvalNumber: c.approvalNumber,
        inspectionOrg: c.inspectionOrg,
        inspectionDate: c.inspectionDate,
        notes: c.notes,
        hasDocuments: c.hasDocuments,
        createdAt: c.createdAt,
      }))
  } catch {
    communityProofs = []
  }

  const nextSteps = computeNextSteps(effectiveApprovalType)

  if (effectiveApprovalType === 'ABG') {
    warnings.push('ABG ist oft fahrzeug-/scheinwerferspezifisch: vor Einbau Anlage/Fahrzeugliste pruefen.')
  }
  if (effectiveApprovalType === 'TEILEGUTACHTEN') {
    warnings.push('Teilegutachten bedeutet in der Praxis meist Abnahme/Eintragung. Plane Termin/Kosten ein.')
  }
  if (effectiveApprovalType === 'EINZELABNAHME_21') {
    warnings.push('§21 Einzelabnahme kann komplex sein (Kombinationswirkung, Messungen). Vorab abstimmen.')
  }

  return NextResponse.json({
    query: { brand, partName, category, approvalNumber, make, model, year, stateId },
    bestMatch,
    suggestions: filtered.length ? filtered : suggestions,
    dbMatches: dbMatches.map((r) => ({
      id: r.id,
      brand: r.brand,
      partName: r.partName,
      category: r.category,
      subcategory: r.subcategory,
      vehicleCompatibility: r.vehicleCompatibility,
      approvalType: r.approvalType,
      approvalNumber: r.approvalNumber,
      sourceId: r.sourceId,
      sourceUrl: r.sourceUrl,
      isSynthetic: r.isSynthetic,
      updatedAt: r.updatedAt,
    })),
    communityProofs,
    approvalType: effectiveApprovalType || 'NONE',
    legalityStatus,
    violations,
    userParameters: Object.keys(userParameters).length ? userParameters : null,
    nextSteps,
    warnings,
    disclaimer: {
      title: 'Hinweis zur StVZO',
      body:
        'DriveTuning stellt technische Informationen bereit und ersetzt nicht die Pruefung durch eine Prueforganisation (TUEV/DEKRA/GTUE). Im Zweifel Originaldokumente verwenden und Ruecksprache halten.',
    },
  })
}
