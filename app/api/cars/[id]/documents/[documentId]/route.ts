import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseElementVisibility } from '@/lib/vocab'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id, documentId } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const visibility = parseElementVisibility(body.visibility)
  if (!visibility) return NextResponse.json({ error: 'Ungueltige Sichtbarkeit' }, { status: 400 })

  const doc = await prisma.document.findFirst({
    where: { id: documentId, carId: car.id, ownerId: session.user.id },
    select: { id: true },
  })
  if (!doc) return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: { visibility },
  })

  return NextResponse.json({ document: updated })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id, documentId } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const doc = await prisma.document.findFirst({
    where: { id: documentId, carId: car.id, ownerId: session.user.id },
    select: { id: true },
  })
  if (!doc) return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })

  await prisma.document.delete({ where: { id: doc.id } })
  return NextResponse.json({ ok: true })
}
