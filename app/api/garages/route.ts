import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const garages = await prisma.garage.findMany({
      where: { userId: session.user.id },
      include: {
        cars: {
          orderBy: { createdAt: 'desc' },
          include: {
            documents: {
              orderBy: { uploadedAt: 'desc' },
              take: 24,
              select: {
                id: true,
                type: true,
                title: true,
                documentNumber: true,
                url: true,
                uploadedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ garages })
  } catch (err) {
    console.error('GET /api/garages failed:', err)
    return NextResponse.json({ error: 'Garagen konnten nicht geladen werden' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const region = typeof body?.region === 'string' ? body.region.trim() : ''

    if (!name || !region) {
      return NextResponse.json({ error: 'Name und Region sind erforderlich' }, { status: 400 })
    }

    const existingGarages = await prisma.garage.count({
      where: { userId: session.user.id },
    })

    const garage = await prisma.garage.create({
      data: {
        userId: session.user.id,
        name,
        region,
        isDefault: existingGarages === 0,
      },
    })

    return NextResponse.json({ garage }, { status: 201 })
  } catch (err) {
    console.error('POST /api/garages failed:', err)
    return NextResponse.json({ error: 'Garage konnte nicht erstellt werden' }, { status: 500 })
  }
}
