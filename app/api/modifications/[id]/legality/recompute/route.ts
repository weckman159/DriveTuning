import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recomputeAndPersistModificationLegality } from '@/lib/legality/validator'
import { consumeRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = await consumeRateLimit({
    namespace: 'modifications:legality:recompute:user',
    identifier: session.user.id,
    limit: 30,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const { id } = await params
  const mod = await prisma.modification.findFirst({
    where: { id, logEntry: { car: { garage: { userId: session.user.id } } } },
    select: { id: true },
  })
  if (!mod) return NextResponse.json({ error: 'Modifikation nicht gefunden' }, { status: 404 })

  const updated = await recomputeAndPersistModificationLegality(mod.id)
  if (!updated) return NextResponse.json({ error: 'Modifikation nicht gefunden' }, { status: 404 })
  return NextResponse.json({ modification: updated })
}

