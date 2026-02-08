import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen haben' },
        { status: 400 }
      )
    }

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
