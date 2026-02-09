import 'server-only'

import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

type ConsumeInput = {
  namespace: string
  identifier: string
  limit: number
  windowMs: number
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: Date }
  | { ok: false; remaining: 0; resetAt: Date; retryAfterSeconds: number }

function salt(): string {
  const v = (process.env.RATE_LIMIT_SALT || '').trim()
  if (v) return v
  const fb = (process.env.NEXTAUTH_SECRET || '').trim()
  return fb || 'dev-rate-limit-salt'
}

function hashKey(parts: string[]): string {
  return createHash('sha256').update([salt(), ...parts].join('|')).digest('hex')
}

export async function consumeRateLimit(input: ConsumeInput): Promise<RateLimitResult> {
  const limit = Math.max(1, Math.floor(input.limit))
  const windowMs = Math.max(1000, Math.floor(input.windowMs))
  const key = hashKey([input.namespace, input.identifier])
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const row = await tx.apiRateLimit.findUnique({
      where: { key },
      select: { key: true, count: true, resetAt: true },
    })

    if (!row || row.resetAt.getTime() <= now.getTime()) {
      const resetAt = new Date(now.getTime() + windowMs)
      const updated = await tx.apiRateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
        select: { count: true, resetAt: true },
      })

      return { ok: true, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt }
    }

    if (row.count + 1 > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000))
      return { ok: false, remaining: 0, resetAt: row.resetAt, retryAfterSeconds }
    }

    const updated = await tx.apiRateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
      select: { count: true, resetAt: true },
    })

    return { ok: true, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt }
  })
}

