type EvidenceInput = {
  hasPhotos: boolean
  hasMileageProof: boolean
  hasTrustedApprovalDoc: boolean
  hasAnyApprovalSignal: boolean
  hasTimestamp: boolean
}

export type EvidenceScore = {
  score: number // 0..100
  tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE'
  breakdown: {
    photo: number
    mileage: number
    approval: number
    timestamp: number
  }
}

function clamp0to100(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function calculateEvidenceScoreV2(input: EvidenceInput): EvidenceScore {
  const photo = input.hasPhotos ? 30 : 0
  const mileage = input.hasMileageProof ? 25 : 0
  // "Trusted" approvals (e.g. EINTRAGUNG) should dominate. If we only have a weak signal,
  // count half so we don't overpromise.
  const approval = input.hasTrustedApprovalDoc ? 35 : input.hasAnyApprovalSignal ? 18 : 0
  const timestamp = input.hasTimestamp ? 10 : 0

  const score = clamp0to100(photo + mileage + approval + timestamp)
  const tier = score >= 85 ? 'GOLD' : score >= 70 ? 'SILVER' : score >= 50 ? 'BRONZE' : 'NONE'

  return {
    score,
    tier,
    breakdown: { photo, mileage, approval, timestamp },
  }
}

