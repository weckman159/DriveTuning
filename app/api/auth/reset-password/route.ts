import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { hashResetToken } from '@/lib/password-reset'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    const rawToken = typeof token === 'string' ? token.trim() : ''
    const newPassword = typeof password === 'string' ? password : ''

    if (!rawToken || newPassword.length < 8) {
      return NextResponse.json({ error: 'Ungueltiger Token oder Passwort' }, { status: 400 })
    }

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
