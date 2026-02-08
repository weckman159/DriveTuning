import { createHash, randomBytes } from 'node:crypto'

export type PasswordResetConfig = {
  ttlMs: number
}

export function defaultPasswordResetConfig(): PasswordResetConfig {
  return { ttlMs: 60 * 60 * 1000 } // 1 hour
}

export function generateResetToken(): string {
  // 32 bytes ~= 256 bits of entropy.
  return randomBytes(32).toString('base64url')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

