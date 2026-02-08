import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id, taskId } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const task = await prisma.buildTask.findFirst({
    where: { id: taskId, carId: car.id },
  })
  if (!task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const title = body.title === undefined ? undefined : (typeof body.title === 'string' ? body.title.trim() : '')
  const description =
    body.description === undefined ? undefined : (typeof body.description === 'string' ? body.description.trim() : null)
  const category =
    body.category === undefined ? undefined : (typeof body.category === 'string' ? body.category.trim() : null)
  const status =
    body.status === undefined ? undefined : (typeof body.status === 'string' ? body.status.trim().toUpperCase() : '')
  const dueAtRaw = body.dueAt

  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'Titel darf nicht leer sein' }, { status: 400 })
  }
  if (title !== undefined && title.length > 200) {
    return NextResponse.json({ error: 'Titel ist zu lang' }, { status: 400 })
  }

  if (status !== undefined && status !== 'TODO' && status !== 'IN_PROGRESS' && status !== 'DONE') {
    return NextResponse.json({ error: 'Ungueltiger Status' }, { status: 400 })
  }

  let dueAt: Date | null | undefined = undefined
  if (body.dueAt !== undefined) {
    if (dueAtRaw === null || (typeof dueAtRaw === 'string' && !dueAtRaw.trim())) {
      dueAt = null
    } else {
      const d = new Date(String(dueAtRaw))
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Ungueltiges Faelligkeitsdatum' }, { status: 400 })
      dueAt = d
    }
  }

  const updated = await prisma.buildTask.update({
    where: { id: task.id },
    data: {
      title: title === undefined ? undefined : title,
      description,
      category,
      status: status === undefined ? undefined : status,
      dueAt,
    },
  })

  return NextResponse.json({ task: updated })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id, taskId } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const task = await prisma.buildTask.findFirst({
    where: { id: taskId, carId: car.id },
    select: { id: true },
  })
  if (!task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })

  await prisma.buildTask.delete({ where: { id: task.id } })
  return NextResponse.json({ ok: true })
}
