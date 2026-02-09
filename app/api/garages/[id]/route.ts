import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await ctx.params
  const garageId = typeof id === 'string' ? id.trim() : ''
  if (!garageId) {
    return NextResponse.json({ error: 'Garage-ID fehlt' }, { status: 400 })
  }

  try {
    const garage = await prisma.garage.findFirst({
      where: { id: garageId, userId: session.user.id },
      select: { id: true, isDefault: true },
    })

    if (!garage) {
      return NextResponse.json({ error: 'Garage nicht gefunden' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.garage.delete({ where: { id: garageId } })

      if (garage.isDefault) {
        const next = await tx.garage.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
        if (next) {
          await tx.garage.update({ where: { id: next.id }, data: { isDefault: true } })
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/garages/[id] failed:', err)
    return NextResponse.json({ error: 'Garage konnte nicht geloescht werden' }, { status: 500 })
  }
}

