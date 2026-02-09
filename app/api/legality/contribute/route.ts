import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeRateLimit } from '@/lib/rate-limit'
import { readJson } from '@/lib/validation'

const APPROVAL_TYPES = new Set([
  'ABE',
  'ABG',
  'EBE',
  'ECE',
  'TEILEGUTACHTEN',
  'EINTRAGUNG',
  'EINTRAGUNGSPFLICHTIG',
  'EINZELABNAHME',
  'EINZELABNAHME_21',
])

const INSPECTION_ORGS = new Set(['tuev_sued', 'tuev_nord', 'tuev_rheinland', 'dekra', 'gtue', 'other'])

function normalizeApprovalType(input: string) {
  const raw = String(input || '').trim().toUpperCase()
  if (raw === 'EINZELABNAHME_21') return 'EINZELABNAHME'
  return raw
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const rl = await consumeRateLimit({
    namespace: 'legality:contribute:user',
    identifier: session.user.id,
    limit: 10,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Beitraege in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const bodySchema = z.object({
    modificationId: z.string().trim().min(1),
    approvalType: z.string().trim().min(1),
    approvalNumber: z.string().trim().max(120).optional().nullable(),
    inspectionOrg: z.string().trim().min(1),
    inspectionDate: z.string().trim().min(1),
    notes: z.string().trim().max(2000).optional().nullable(),
    isAnonymous: z.coerce.boolean().optional(),
    hasDocuments: z.coerce.boolean().optional(),
  })
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })

  const modificationId = parsed.data.modificationId
  const approvalTypeNorm = normalizeApprovalType(parsed.data.approvalType)
  if (!APPROVAL_TYPES.has(approvalTypeNorm)) {
    return NextResponse.json({ error: 'Ungueltiger Genehmigungstyp' }, { status: 400 })
  }

  const inspectionOrg = String(parsed.data.inspectionOrg || '').trim().toLowerCase()
  if (!INSPECTION_ORGS.has(inspectionOrg)) {
    return NextResponse.json({ error: 'Ungueltige Prueforganisation' }, { status: 400 })
  }

  const inspectionDate = new Date(parsed.data.inspectionDate)
  if (!Number.isFinite(inspectionDate.getTime())) {
    return NextResponse.json({ error: 'Ungueltiges Datum' }, { status: 400 })
  }

  const mod = await prisma.modification.findFirst({
    where: {
      id: modificationId,
      logEntry: { car: { garage: { userId: session.user.id } } },
    },
    select: { id: true },
  })
  if (!mod) {
    return NextResponse.json({ error: 'Modification nicht gefunden' }, { status: 404 })
  }

  const approvalNumber = parsed.data.approvalNumber ? parsed.data.approvalNumber.trim() : null
  const notes = parsed.data.notes ? parsed.data.notes.trim() : null
  const isAnonymous = parsed.data.isAnonymous !== false
  const hasDocuments = parsed.data.hasDocuments === true

  const contribution = await prisma.legalityContribution.create({
    data: {
      userId: session.user.id,
      modificationId: mod.id,
      approvalType: approvalTypeNorm,
      approvalNumber,
      inspectionOrg,
      inspectionDate,
      notes,
      status: 'PENDING',
      isAnonymous,
      hasDocuments,
    },
    select: {
      id: true,
      approvalType: true,
      approvalNumber: true,
      inspectionOrg: true,
      inspectionDate: true,
      notes: true,
      status: true,
      isAnonymous: true,
      hasDocuments: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ contribution }, { status: 201 })
}

