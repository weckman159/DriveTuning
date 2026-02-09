import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { consumeRateLimit } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const bodySchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req) || 'unknown'
    const rl = await consumeRateLimit({
      namespace: 'auth:register:ip',
      identifier: ip,
      limit: 5,
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
      return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })
    }

    const name = parsed.data.name
    const email = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Es existiert bereits ein Benutzer mit dieser E-Mail' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
      },
    })

    // Create privacy settings
    await prisma.userPrivacySettings.create({
      data: {
        userId: user.id,
        hideGarageLocation: true,
        autoBlurPlates: true,
        showRealName: false,
        defaultCarVisibility: 'UNLISTED',
      },
    })

    // Create default garage
    await prisma.garage.create({
      data: {
        userId: user.id,
        name: 'Meine Garage',
        region: 'Deutschland',
        isDefault: true,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Datenbankverbindung fehlgeschlagen. Bitte pruefe, ob DATABASE_URL konfiguriert ist.' },
      { status: 500 }
    )
  }
}
