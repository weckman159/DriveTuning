import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseElementVisibilityOrDefault } from '@/lib/vocab'
import { persistDocumentDataUrl } from '@/lib/blob-storage'
import { consumeRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const bodySchema = z.object({
  type: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().max(200).optional().nullable(),
  issuer: z.string().trim().max(120).optional().nullable(),
  documentNumber: z.string().trim().max(80).optional().nullable(),
  url: z.string().trim().optional(),
  fileDataUrl: z.string().trim().optional(),
  modificationId: z.string().trim().optional(),
  visibility: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const documents = await prisma.document.findMany({
    where: { carId: car.id, ownerId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = await consumeRateLimit({
    namespace: 'cars:documents:create:user',
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
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })
  }

  const body = parsed.data
  const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : 'OTHER'
  const title = body.title ?? null
  const issuer = body.issuer ?? null
  const documentNumber = body.documentNumber ?? null
  const urlRaw = typeof body.url === 'string' ? body.url.trim() : ''
  const fileDataUrl = typeof body.fileDataUrl === 'string' ? body.fileDataUrl.trim() : ''
  const modificationIdRaw = typeof body.modificationId === 'string' ? body.modificationId.trim() : ''
  const visibility = parseElementVisibilityOrDefault(body.visibility, 'SELF')

  if (!urlRaw && !fileDataUrl) {
    return NextResponse.json({ error: 'Bitte URL angeben oder eine Datei hochladen' }, { status: 400 })
  }

  if (urlRaw && !/^https?:\/\//i.test(urlRaw) && !urlRaw.startsWith('/')) {
    return NextResponse.json({ error: 'URL muss mit http(s) beginnen oder ein lokaler Pfad sein' }, { status: 400 })
  }

  let modificationId: string | null = null
  if (modificationIdRaw) {
    const mod = await prisma.modification.findFirst({
      where: {
        id: modificationIdRaw,
        logEntry: { carId: car.id, car: { garage: { userId: session.user.id } } },
      },
      select: { id: true },
    })
    if (!mod) return NextResponse.json({ error: 'Ungueltige modificationId' }, { status: 400 })
    modificationId = mod.id
  }

  let url = urlRaw
  if (fileDataUrl) {
    try {
      const persisted = await persistDocumentDataUrl(fileDataUrl, `documents/${session.user.id}/${car.id}`)
      url = persisted.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Dokument-Upload fehlgeschlagen'
      if (msg === 'Media storage not configured') {
        return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
      }
      if (msg === 'Document too large' || msg === 'Unsupported document type' || msg === 'Invalid data URL') {
        const mapped =
          msg === 'Document too large'
            ? 'Dokument zu gross'
            : msg === 'Unsupported document type'
              ? 'Dokumenttyp nicht unterstuetzt'
              : 'Ungueltige Datei-Daten'
        return NextResponse.json({ error: mapped }, { status: 400 })
      }
      console.error('[documents] persist error', err)
      return NextResponse.json({ error: 'Dokument-Upload fehlgeschlagen' }, { status: 500 })
    }
  }

  const doc = await prisma.document.create({
    data: {
      ownerId: session.user.id,
      carId: car.id,
      modificationId,
      type,
      status: 'UPLOADED',
      title,
      issuer,
      documentNumber,
      url,
      visibility,
    },
  })

  const approvalTypes = new Set(['ABE', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'])
  if (modificationId && approvalTypes.has(type)) {
    try {
      await prisma.approvalDocument.create({
        data: {
          modificationId,
          documentId: doc.id,
          approvalType: type,
          approvalNumber: documentNumber,
          issuingAuthority: issuer,
        },
      })
    } catch {
      // Best effort: document upload should still succeed even if structured approval insert fails.
    }
  }

  return NextResponse.json({ document: doc }, { status: 201 })
}
