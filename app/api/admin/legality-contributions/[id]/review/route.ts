import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminSession } from '@/lib/admin'
import { readJson } from '@/lib/validation'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  const { id } = await params

  const bodySchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
  })
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })

  const updated = await prisma.legalityContribution.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      rejectionReason: parsed.data.decision === 'REJECTED' ? (parsed.data.rejectionReason || 'Rejected') : null,
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ contribution: updated })
}

