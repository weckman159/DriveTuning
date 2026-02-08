import { put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

function allowInlineMedia(): boolean {
  // Dev convenience: allow storing inline base64 when blob storage isn't configured.
  // In production, require blob storage unless explicitly overridden.
  if (process.env.ALLOW_INLINE_MEDIA === 'true') return true
  return process.env.NODE_ENV !== 'production'
}

function getBlobReadWriteToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) return process.env.VERCEL_BLOB_READ_WRITE_TOKEN

  // Support Vercel's "Custom Prefix" env var naming (e.g. MEDIA_BLOB_READ_WRITE_TOKEN).
  const fallback = Object.entries(process.env).find(([key, value]) => {
    if (!value) return false
    if (!key.endsWith('_READ_WRITE_TOKEN')) return false
    return key.includes('BLOB')
  })

  return fallback?.[1]
}

function parseMaxImageBytes(): number {
  const raw = process.env.MAX_IMAGE_BYTES
  if (!raw) return 2 * 1024 * 1024
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 2 * 1024 * 1024
  return Math.floor(n)
}

function isAllowedImageMime(mimeType: string): boolean {
  return (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp' ||
    mimeType === 'image/gif'
  )
}

function parseDataUrl(input: string): { mimeType: string; buffer: Buffer } | null {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1]
  const payload = match[2]
  return { mimeType, buffer: Buffer.from(payload, 'base64') }
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'bin'
}

export async function persistImage(input: string, folder: string): Promise<string> {
  const data = parseDataUrl(input)
  if (!data) return input

  if (!isAllowedImageMime(data.mimeType)) {
    throw new Error('Unsupported image type')
  }

  const maxBytes = parseMaxImageBytes()
  if (data.buffer.byteLength > maxBytes) {
    throw new Error('Image too large')
  }

  const token = getBlobReadWriteToken()
  if (!token) {
    if (allowInlineMedia()) return input
    throw new Error('Media storage not configured')
  }

  const fileName = `${folder}/${Date.now()}-${randomUUID()}.${extensionFromMime(data.mimeType)}`
  const blob = await put(fileName, data.buffer, {
    access: 'public',
    contentType: data.mimeType,
    token,
    addRandomSuffix: false,
  })

  return blob.url
}

export async function persistImages(inputs: string[], folder: string, maxCount = 4): Promise<string[]> {
  const sliced = inputs.slice(0, maxCount)
  const results = await Promise.all(sliced.map((input) => persistImage(input, folder)))
  return results
}
