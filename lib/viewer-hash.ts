import { createHash } from 'node:crypto'

export function computeViewerHash(input: {
  ip?: string | null
  userAgent?: string | null
  acceptLanguage?: string | null
}): string | null {
  const salt = (process.env.VIEWER_HASH_SALT || '').trim()
  // If the operator didn't configure a salt, disable tracking. A stable salt is required
  // to avoid storing reversible viewer fingerprints or meaningless hashes.
  if (!salt) return null
  const ip = (input.ip || '').trim()
  const ua = (input.userAgent || '').trim()
  const lang = (input.acceptLanguage || '').trim()

  // If we have no stable inputs, skip logging.
  if (!ip && !ua && !lang) return null

  // Never store raw IP; store a salted hash.
  return createHash('sha256')
    .update([salt, ip, ua, lang].join('|'))
    .digest('hex')
}
