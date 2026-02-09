import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { defaultPasswordResetConfig, generateResetToken, hashResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'
import { consumeRateLimit } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const bodySchema = z.object({
  email: z.string().trim().email().optional(),
})

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function POST(req: Request) {
  try {
    const okResponse = NextResponse.json({ ok: true })

    const parsed = bodySchema.safeParse(await readJson(req))
    const normalizedEmail = parsed.success && parsed.data.email ? parsed.data.email.trim().toLowerCase() : ''

    // Always respond with success to avoid account enumeration.
    const ip = getRequestIp(req) || 'unknown'
    const ipLimit = await consumeRateLimit({
      namespace: 'auth:forgot-password:ip',
      identifier: ip,
      limit: 10,
      windowMs: 60_000,
    })
    if (!ipLimit.ok) return okResponse

    if (!normalizedEmail) return okResponse

    const emailLimit = await consumeRateLimit({
      namespace: 'auth:forgot-password:email',
      identifier: normalizedEmail,
      limit: 3,
      windowMs: 60_000,
    })
    if (!emailLimit.ok) return okResponse

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    })

    if (!user?.email) return okResponse

    const cfg = defaultPasswordResetConfig()
    const token = generateResetToken()
    const tokenHash = hashResetToken(token)
    const expiresAt = new Date(Date.now() + cfg.ttlMs)

    // Limit active tokens per user.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })

    const resetLink = `${baseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`
    const subject = 'DRIVETUNING: Passwort zuruecksetzen'
    const safeName = user.name || 'da'

    await sendEmail({
      to: user.email,
      subject,
      text: `Hallo ${safeName},\n\nSetze dein Passwort mit diesem Link zurueck:\n${resetLink}\n\nDieser Link ist 1 Stunde gueltig.\nWenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
      html: `<p>Hallo ${safeName},</p><p>Setze dein Passwort mit diesem Link zurueck:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Dieser Link ist 1 Stunde gueltig.</p><p>Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
    })

    // Dev convenience: allow debugging without mail provider.
    if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, resetLink })
    }

    return okResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    // Still don't leak anything.
    return NextResponse.json({ ok: true })
  }
}
