type ProvenanceInput = {
  hasInstalledPhoto: boolean
  hasInstalledMileage: boolean
  hasRemovedMileage: boolean
  hasPrice: boolean
  documentCount: number
  hasTuvStatus: boolean
}

export function calculateEvidenceScore(input: ProvenanceInput): number {
  let score = 0

  if (input.hasInstalledPhoto) score += 2
  if (input.hasInstalledMileage) score += 2
  if (input.hasRemovedMileage) score += 1
  if (input.hasPrice) score += 1
  if (input.hasTuvStatus) score += 2
  if (input.documentCount >= 1) score += 1
  if (input.documentCount >= 2) score += 1

  return Math.min(score, 10)
}
