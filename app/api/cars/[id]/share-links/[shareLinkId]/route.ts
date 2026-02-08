import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; shareLinkId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id, shareLinkId } = await params
  const body = await req.json().catch(() => ({} as unknown))
  const action = typeof (body as any)?.action === 'string' ? String((body as any).action) : ''

  if (action !== 'REVOKE') {
    return NextResponse.json({ error: 'Aktion nicht unterstuetzt' }, { status: 400 })
  }

  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })

  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const link = await prisma.shareLink.findFirst({
    where: { id: shareLinkId, carId: car.id, ownerId: session.user.id },
    select: { id: true, revokedAt: true },
  })

  if (!link) return NextResponse.json({ error: 'Share-Link nicht gefunden' }, { status: 404 })

  const updated = await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: link.revokedAt ?? new Date() },
    select: { id: true, revokedAt: true },
  })

  return NextResponse.json({ shareLink: updated })
}
