import 'server-only'

type ApprovalDocLike = {
  approvalType?: string | null
} | null

type ModificationLike = {
  id: string
  tuvStatus: string
  documents?: Array<{ type: string }> | null
  approvalDocuments?: ApprovalDocLike[] | null
}

export type TuvReadiness = {
  status: 'READY' | 'NEEDS_DOCS' | 'NOT_READY' | 'UNKNOWN'
  score: number
  summary: {
    totalMods: number
    green: number
    yellow: number
    red: number
    withApprovals: number
    missingApprovals: number
  }
  actions: string[]
}

const APPROVAL_TYPES = new Set(['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'])

function norm(input: string | null | undefined): string {
  return (input || '').trim().toUpperCase()
}

function hasApproval(mod: ModificationLike): boolean {
  const byStructured = Array.isArray(mod.approvalDocuments) && mod.approvalDocuments.some((d) => APPROVAL_TYPES.has(norm((d as any)?.approvalType)))
  if (byStructured) return true
  const byDocs = Array.isArray(mod.documents) && mod.documents.some((d) => APPROVAL_TYPES.has(norm(d.type)))
  return byDocs
}

export function computeTuvReadiness(modifications: ModificationLike[]): TuvReadiness {
  const mods = Array.isArray(modifications) ? modifications : []
  const totalMods = mods.length

  let green = 0
  let yellow = 0
  let red = 0
  let withApprovals = 0
  let missingApprovals = 0

  const actions: string[] = []

  for (const m of mods) {
    const s = norm(m.tuvStatus)
    if (s === 'GREEN_REGISTERED') green++
    else if (s === 'YELLOW_ABE') yellow++
    else if (s === 'RED_RACING') red++

    const approved = hasApproval(m)
    if (approved) withApprovals++

    // Basic rules (v1):
    // - GREEN_REGISTERED: OK (approval doc still useful but not required).
    // - YELLOW_ABE: require ABE/EBE/Teilegutachten evidence.
    // - RED_RACING: never TUV-ready as-is.
    if (s === 'YELLOW_ABE' && !approved) {
      missingApprovals++
      actions.push('Fuege ABE/EBE/Teilegutachten als Nachweis hinzu (mind. 1 pro gelbe Modifikation).')
    }
    if (s === 'RED_RACING') {
      actions.push('Racing-Teile (rot) verhindern TUEV-Ready. Dokumentiere Ausbau oder Einzelabnahme/Eintragung.')
    }
  }

  const uniqueActions = Array.from(new Set(actions))

  if (totalMods === 0) {
    return {
      status: 'UNKNOWN',
      score: 0,
      summary: { totalMods, green, yellow, red, withApprovals, missingApprovals },
      actions: ['Noch keine Modifikationen dokumentiert.'],
    }
  }

  if (red > 0) {
    return {
      status: 'NOT_READY',
      score: Math.max(0, 60 - red * 20),
      summary: { totalMods, green, yellow, red, withApprovals, missingApprovals },
      actions: uniqueActions,
    }
  }

  if (missingApprovals > 0) {
    const base = Math.max(0, 80 - missingApprovals * 15)
    return {
      status: 'NEEDS_DOCS',
      score: base,
      summary: { totalMods, green, yellow, red, withApprovals, missingApprovals },
      actions: uniqueActions,
    }
  }

  return {
    status: 'READY',
    score: 95,
    summary: { totalMods, green, yellow, red, withApprovals, missingApprovals },
    actions: uniqueActions.length ? uniqueActions : ['Alle dokumentierten Modifikationen haben Nachweise.'],
  }
}
