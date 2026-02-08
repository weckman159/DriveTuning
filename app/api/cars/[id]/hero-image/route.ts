import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistImage } from '@/lib/image-storage'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({} as any))
  const imageDataUrl = typeof (body as any).imageDataUrl === 'string' ? (body as any).imageDataUrl : ''
  if (!imageDataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Ungueltige Bilddaten' }, { status: 400 })
  }

  try {
    const url = await persistImage(imageDataUrl, `cars/${session.user.id}/${car.id}/hero`)

    const updated = await prisma.car.update({
      where: { id: car.id },
      data: { heroImage: url },
      select: { heroImage: true },
    })

    return NextResponse.json({ heroImage: updated.heroImage }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hero-Bild-Upload fehlgeschlagen'
    if (msg === 'Image too large' || msg === 'Unsupported image type') {
      const mapped = msg === 'Image too large' ? 'Bild zu gross' : 'Bildtyp nicht unterstuetzt'
      return NextResponse.json({ error: mapped }, { status: 400 })
    }
    if (msg === 'Media storage not configured') {
      return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Hero-Bild-Upload fehlgeschlagen' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const updated = await prisma.car.update({
    where: { id: car.id },
    data: { heroImage: null },
    select: { heroImage: true },
  })

  return NextResponse.json({ heroImage: updated.heroImage })
}
