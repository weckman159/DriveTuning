import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { defaultPasswordResetConfig, generateResetToken, hashResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    // Always respond with success to avoid account enumeration.
    const okResponse = NextResponse.json({ ok: true })

    if (!normalizedEmail) return okResponse

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
