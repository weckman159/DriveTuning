import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { hashResetToken } from '@/lib/password-reset'
import { consumeRateLimit } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const bodySchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req) || 'unknown'
    const rl = await consumeRateLimit({
      namespace: 'auth:reset-password:ip',
      identifier: ip,
      limit: 10,
      windowMs: 60_000,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte spaeter erneut versuchen.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const parsed = bodySchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltiger Token oder Passwort' }, { status: 400 })
    }

    const rawToken = parsed.data.token
    const newPassword = parsed.data.password

    const tokenHash = hashResetToken(rawToken)

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    })

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Reset-Link ist ungueltig oder abgelaufen' }, { status: 400 })
    }

    const hashedPassword = await hash(newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Etwas ist schiefgelaufen' }, { status: 500 })
  }
}
