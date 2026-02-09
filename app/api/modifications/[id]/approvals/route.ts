import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { persistDocumentDataUrl } from '@/lib/blob-storage'
import { parseElementVisibilityOrDefault } from '@/lib/vocab'
import { consumeRateLimit } from '@/lib/rate-limit'
import { readJson } from '@/lib/validation'

const APPROVAL_TYPES = ['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'] as const

const bodySchema = z.object({
  approvalType: z.enum(APPROVAL_TYPES),
  approvalNumber: z.string().trim().max(80).optional().nullable(),
  issuingAuthority: z.string().trim().max(120).optional().nullable(),
  issueDate: z.string().trim().optional().nullable(),
  validUntil: z.string().trim().optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  url: z.string().trim().optional().nullable(),
  fileDataUrl: z.string().trim().optional().nullable(),
  visibility: z.string().optional().nullable(),
})

function parseOptionalDate(input: string | null | undefined): Date | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const mod = await prisma.modification.findFirst({
    where: { id, logEntry: { car: { garage: { userId: session.user.id } } } },
    select: { id: true },
  })
  if (!mod) return NextResponse.json({ error: 'Modifikation nicht gefunden' }, { status: 404 })

  const approvals = await prisma.approvalDocument.findMany({
    where: { modificationId: mod.id },
    orderBy: { createdAt: 'desc' },
    include: {
      document: { select: { id: true, type: true, title: true, issuer: true, documentNumber: true, url: true, uploadedAt: true, visibility: true } },
    },
  })

  return NextResponse.json({ approvals })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = await consumeRateLimit({
    namespace: 'modifications:approvals:create:user',
    identifier: session.user.id,
    limit: 20,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Uploads in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const { id } = await params
  const mod = await prisma.modification.findFirst({
    where: { id, logEntry: { car: { garage: { userId: session.user.id } } } },
    select: { id: true, logEntry: { select: { carId: true } } },
  })
  if (!mod) return NextResponse.json({ error: 'Modifikation nicht gefunden' }, { status: 404 })

  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })

  const visibility = parseElementVisibilityOrDefault(parsed.data.visibility, 'SELF')
  const urlRaw = (parsed.data.url || '').trim()
  const fileDataUrl = (parsed.data.fileDataUrl || '').trim()
  if (!urlRaw && !fileDataUrl) {
    return NextResponse.json({ error: 'Bitte URL angeben oder eine Datei hochladen' }, { status: 400 })
  }

  let url = urlRaw
  if (fileDataUrl) {
    try {
      const persisted = await persistDocumentDataUrl(fileDataUrl, `approvals/${session.user.id}/${mod.id}`)
      url = persisted.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Dokument-Upload fehlgeschlagen'
      if (msg === 'Media storage not configured') return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
      if (msg === 'Document too large') return NextResponse.json({ error: 'Dokument zu gross' }, { status: 400 })
      if (msg === 'Unsupported document type') return NextResponse.json({ error: 'Dokumenttyp nicht unterstuetzt' }, { status: 400 })
      return NextResponse.json({ error: 'Dokument-Upload fehlgeschlagen' }, { status: 500 })
    }
  }

  const issueDate = parseOptionalDate(parsed.data.issueDate)
  if (parsed.data.issueDate && !issueDate) return NextResponse.json({ error: 'Ungueltiges Ausstellungsdatum' }, { status: 400 })
  const validUntil = parseOptionalDate(parsed.data.validUntil)
  if (parsed.data.validUntil && !validUntil) return NextResponse.json({ error: 'Ungueltiges Gueltig-bis Datum' }, { status: 400 })

  const created = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        ownerId: session.user.id,
        carId: mod.logEntry.carId,
        modificationId: mod.id,
        type: parsed.data.approvalType,
        status: 'UPLOADED',
        title: parsed.data.title ?? null,
        issuer: parsed.data.issuingAuthority ?? null,
        documentNumber: parsed.data.approvalNumber ?? null,
        url,
        visibility,
      },
    })

    const approval = await tx.approvalDocument.create({
      data: {
        modificationId: mod.id,
        documentId: document.id,
        approvalType: parsed.data.approvalType,
        approvalNumber: parsed.data.approvalNumber ?? null,
        issuingAuthority: parsed.data.issuingAuthority ?? null,
        issueDate,
        validUntil,
      },
      include: {
        document: { select: { id: true, type: true, title: true, issuer: true, documentNumber: true, url: true, uploadedAt: true, visibility: true } },
      },
    })

    return approval
  })

  return NextResponse.json({ approval: created }, { status: 201 })
}
