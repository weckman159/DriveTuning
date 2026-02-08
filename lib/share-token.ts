import { randomBytes } from 'node:crypto'

export function generateShareToken(): string {
  // URL-safe token for share links (no padding).
  return randomBytes(24).toString('base64url')
}

