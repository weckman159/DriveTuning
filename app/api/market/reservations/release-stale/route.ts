import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseTtlMinutes(input: unknown): number {
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(n)) return 45
  // clamp: prevent "release everything" mistakes and keep endpoint safe-ish
  return Math.min(Math.max(Math.floor(n), 10), 240)
}

export async function POST(req: Request) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  const providedSecret = (req.headers.get('x-cron-secret') || '').trim()
  const cronAuthorized = Boolean(cronSecret && providedSecret && cronSecret === providedSecret)

  if (!cronAuthorized) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const ttlMinutes = parseTtlMinutes((body as any).ttlMinutes ?? (body as any).minutes)
  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000)

  const stale = await prisma.marketOrder.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
    select: { id: true, partListingId: true },
    take: 200,
  })

  if (stale.length === 0) {
    return NextResponse.json({ released: 0, cancelled: 0, ttlMinutes, cutoff: cutoff.toISOString() })
  }

  const orderIds = stale.map((o) => o.id)
  const listingIds = Array.from(new Set(stale.map((o) => o.partListingId)))

  const result = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.marketOrder.updateMany({
      where: { id: { in: orderIds }, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })
    const released = await tx.partListing.updateMany({
      where: { id: { in: listingIds }, status: 'RESERVED' },
      data: { status: 'ACTIVE' },
    })
    return { cancelled: cancelled.count, released: released.count }
  })

  return NextResponse.json({ ...result, ttlMinutes, cutoff: cutoff.toISOString() })
}
