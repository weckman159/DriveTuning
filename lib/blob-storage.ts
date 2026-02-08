import { put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

type PersistResult = {
  url: string
  mimeType: string
  bytes: number
}

function allowInlineMedia(): boolean {
  if (process.env.ALLOW_INLINE_MEDIA === 'true') return true
  return process.env.NODE_ENV !== 'production'
}

function getBlobReadWriteToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) return process.env.VERCEL_BLOB_READ_WRITE_TOKEN

  const fallback = Object.entries(process.env).find(([key, value]) => {
    if (!value) return false
    if (!key.endsWith('_READ_WRITE_TOKEN')) return false
    return key.includes('BLOB')
  })

  return fallback?.[1]
}

function parseMaxDocumentBytes(): number {
  const raw = process.env.MAX_DOCUMENT_BYTES
  if (!raw) return 10 * 1024 * 1024
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 10 * 1024 * 1024
  return Math.floor(n)
}

function parseDataUrl(input: string): { mimeType: string; buffer: Buffer } | null {
  const match = input.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') }
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'bin'
}

function isAllowedDocumentMime(mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' ||
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp' ||
    mimeType === 'image/gif'
  )
}

export async function persistDocumentDataUrl(input: string, folder: string): Promise<PersistResult> {
  const data = parseDataUrl(input)
  if (!data) {
    throw new Error('Invalid data URL')
  }

  if (!isAllowedDocumentMime(data.mimeType)) {
    throw new Error('Unsupported document type')
  }

  const maxBytes = parseMaxDocumentBytes()
  if (data.buffer.byteLength > maxBytes) {
    throw new Error('Document too large')
  }

  const token = getBlobReadWriteToken()
  if (!token) {
    if (allowInlineMedia()) {
      return { url: input, mimeType: data.mimeType, bytes: data.buffer.byteLength }
    }
    throw new Error('Media storage not configured')
  }

  const fileName = `${folder}/${Date.now()}-${randomUUID()}.${extensionFromMime(data.mimeType)}`
  const blob = await put(fileName, data.buffer, {
    access: 'public',
    contentType: data.mimeType,
    token,
    addRandomSuffix: false,
  })

  return { url: blob.url, mimeType: data.mimeType, bytes: data.buffer.byteLength }
}

