import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const tasks = await prisma.buildTask.findMany({
    where: { carId: car.id },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ tasks })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : null
  const category = typeof body.category === 'string' ? body.category.trim() : null
  const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : 'TODO'
  const dueAtRaw = body.dueAt

  if (!title) return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
  if (title.length > 200) return NextResponse.json({ error: 'Titel ist zu lang' }, { status: 400 })

  if (status !== 'TODO' && status !== 'IN_PROGRESS' && status !== 'DONE') {
    return NextResponse.json({ error: 'Ungueltiger Status' }, { status: 400 })
  }

  let dueAt: Date | null = null
  if (dueAtRaw !== undefined && dueAtRaw !== null && String(dueAtRaw).trim()) {
    const d = new Date(String(dueAtRaw))
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Ungueltiges Faelligkeitsdatum' }, { status: 400 })
    dueAt = d
  }

  const task = await prisma.buildTask.create({
    data: {
      carId: car.id,
      title,
      description,
      category,
      status,
      dueAt,
    },
  })

  return NextResponse.json({ task }, { status: 201 })
}
