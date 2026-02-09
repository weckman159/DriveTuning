import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseElementVisibilityOrDefault, parseLogEntryType, parseTuvStatus } from '@/lib/vocab'
import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit'
import { persistImages } from '@/lib/image-storage'
import { persistDocumentDataUrl } from '@/lib/blob-storage'
import { z } from 'zod'
import { readJson } from '@/lib/validation'
import { recomputeAndPersistModificationLegality } from '@/lib/legality/validator'

const APPROVAL_TYPES = ['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG'] as const

const bodySchema = z.object({
  type: z.string(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  date: z.string(),
  totalCostImpact: z.union([z.number(), z.string()]).optional().nullable(),
  visibility: z.string().optional().nullable(),
  modification: z
    .object({
      partName: z.string().trim().min(1).max(120),
      brand: z.string().trim().max(80).optional().nullable(),
      category: z.string().trim().min(1).max(40),
      price: z.union([z.number(), z.string()]).optional().nullable(),
      tuvStatus: z.string(),
      userParameters: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .nullable(),
      installedAt: z.string().trim().optional().nullable(),
      installedMileage: z.union([z.number(), z.string()]).optional().nullable(),
      removedAt: z.string().trim().optional().nullable(),
      removedMileage: z.union([z.number(), z.string()]).optional().nullable(),
    })
    .optional()
    .nullable(),
  documents: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(40),
        title: z.string().trim().max(200).optional().nullable(),
        issuer: z.string().trim().max(120).optional().nullable(),
        documentNumber: z.string().trim().max(80).optional().nullable(),
        url: z.string().trim().optional().nullable(),
        fileDataUrl: z.string().trim().optional().nullable(),
        visibility: z.string().optional().nullable(),
        attachTo: z.enum(['CAR', 'MODIFICATION']).optional(),
        approvalType: z.enum(APPROVAL_TYPES).optional().nullable(),
        approvalNumber: z.string().trim().max(80).optional().nullable(),
        issuingAuthority: z.string().trim().max(120).optional().nullable(),
        issueDate: z.string().trim().optional().nullable(),
        validUntil: z.string().trim().optional().nullable(),
      })
    )
    .optional(),
  media: z.array(z.string()).optional(),
})

type DocumentItem = NonNullable<z.infer<typeof bodySchema>['documents']>[number]

function parseOptionalDate(input: unknown): Date | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function safeStringifyUserParameters(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  try {
    const json = JSON.stringify(input)
    if (!json || json.length > 4000) return null
    return json
  } catch {
    return null
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const rl = await consumeRateLimit({
    namespace: 'cars:log-entries:create:user',
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

  const { id: carId } = await params
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })
  }

  const body = parsed.data as z.infer<typeof bodySchema>
  const type = parseLogEntryType(body.type)
  const title = body.title
  const description = typeof body.description === 'string' ? body.description : null
  const dateRaw = body.date
  const totalCostImpactRaw = body.totalCostImpact
  const modification = body.modification
  const elementVisibility = parseElementVisibilityOrDefault(body.visibility, 'SELF')

  if (!type) return NextResponse.json({ error: 'Ungueltiger Typ' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })

  const parsedDate = new Date(String(dateRaw || ''))
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Ungueltiges Datum' }, { status: 400 })
  }

  const totalCostImpact =
    totalCostImpactRaw === null || totalCostImpactRaw === undefined || totalCostImpactRaw === ''
      ? null
      : Number(totalCostImpactRaw)

  if (totalCostImpact !== null && (!Number.isFinite(totalCostImpact) || totalCostImpact < 0)) {
    return NextResponse.json({ error: 'Ungueltiger Betrag' }, { status: 400 })
  }

  // Verify car belongs to user
  const car = await prisma.car.findFirst({
    where: {
      id: carId,
      garage: { userId: session.user.id },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  if (type === 'MODIFICATION' && modification !== undefined && modification !== null) {
    const partName = modification.partName
    const category = modification.category
    const tuvStatus = parseTuvStatus(modification.tuvStatus)
    if (!tuvStatus) return NextResponse.json({ error: 'Ungueltiger TUEV-Status' }, { status: 400 })
    if (!partName) return NextResponse.json({ error: 'Teilname ist erforderlich' }, { status: 400 })
    if (!category) return NextResponse.json({ error: 'Kategorie ist erforderlich' }, { status: 400 })

    const priceRaw = modification.price
    if (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') {
      const price = Number(priceRaw)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Ungueltiger Preis' }, { status: 400 })
      }
    }
  }

  if (type === 'MODIFICATION' && (modification === undefined || modification === null)) {
    return NextResponse.json({ error: 'Fuer Modifikationen sind Teildaten erforderlich' }, { status: 400 })
  }

  const safeMediaInputs = Array.isArray(body.media)
    ? body.media
        .filter((u): u is string => typeof u === 'string' && (u.startsWith('data:image/') || /^https?:\/\//i.test(u)))
        .slice(0, 6)
    : []

  const safeDocInputs = Array.isArray(body.documents) ? body.documents.slice(0, 8) : []
  for (const d of safeDocInputs) {
    const hasUrl = typeof d.url === 'string' && d.url.trim()
    const hasFile = typeof d.fileDataUrl === 'string' && d.fileDataUrl.trim()
    if (!hasUrl && !hasFile) {
      return NextResponse.json({ error: 'Dokument: URL oder Datei ist erforderlich' }, { status: 400 })
    }
  }

  let persistedMedia: string[] = []
  if (safeMediaInputs.length) {
    try {
      persistedMedia = await persistImages(safeMediaInputs, `log/${session.user.id}/${carId}`, 6)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Medien konnten nicht verarbeitet werden'
      if (msg === 'Media storage not configured') return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
      if (msg === 'Image too large') return NextResponse.json({ error: 'Bild zu gross' }, { status: 400 })
      if (msg === 'Unsupported image type') return NextResponse.json({ error: 'Bildtyp nicht unterstuetzt' }, { status: 400 })
      return NextResponse.json({ error: 'Medien konnten nicht verarbeitet werden' }, { status: 500 })
    }
  }

  const preparedDocs = [] as Array<Omit<DocumentItem, 'url' | 'fileDataUrl'> & { url: string }>
  for (const d of safeDocInputs) {
    const urlRaw = (d.url || '').trim()
    const fileDataUrl = (d.fileDataUrl || '').trim()
    let url = urlRaw
    if (fileDataUrl) {
      try {
        const persisted = await persistDocumentDataUrl(fileDataUrl, `documents/${session.user.id}/${carId}/log`)
        url = persisted.url
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Dokument-Upload fehlgeschlagen'
        if (msg === 'Media storage not configured') return NextResponse.json({ error: 'Medien-Speicher ist nicht konfiguriert' }, { status: 500 })
        if (msg === 'Document too large') return NextResponse.json({ error: 'Dokument zu gross' }, { status: 400 })
        if (msg === 'Unsupported document type') return NextResponse.json({ error: 'Dokumenttyp nicht unterstuetzt' }, { status: 400 })
        if (msg === 'Invalid data URL') return NextResponse.json({ error: 'Ungueltige Datei-Daten' }, { status: 400 })
        return NextResponse.json({ error: 'Dokument-Upload fehlgeschlagen' }, { status: 500 })
      }
    }
    if (!url) return NextResponse.json({ error: 'Dokument: URL ist ungueltig' }, { status: 400 })
    preparedDocs.push({
      ...d,
      url,
    } as any)
  }

  const created = await prisma.$transaction(async (tx) => {
    const logEntry = await tx.logEntry.create({
      data: {
        carId,
        visibility: elementVisibility,
        type,
        title,
        description,
        date: parsedDate,
        totalCostImpact,
        media: persistedMedia.length
          ? {
              create: persistedMedia.map((url) => ({ type: 'IMAGE', url })),
            }
          : undefined,
        modifications:
          type === 'MODIFICATION' && modification
            ? {
                create: {
                  partName: modification.partName,
                  brand: modification.brand ?? null,
                  category: modification.category,
                  price:
                    modification.price === null || modification.price === undefined || modification.price === ''
                      ? null
                      : Number(modification.price),
                  tuvStatus: parseTuvStatus(modification.tuvStatus) || 'YELLOW_ABE',
                  userParametersJson: safeStringifyUserParameters((modification as any).userParameters),
                  installedAt: parseOptionalDate(modification.installedAt),
                  installedMileage:
                    modification.installedMileage === null || modification.installedMileage === undefined || modification.installedMileage === ''
                      ? null
                      : Math.floor(Number(modification.installedMileage)),
                  removedAt: parseOptionalDate(modification.removedAt),
                  removedMileage:
                    modification.removedMileage === null || modification.removedMileage === undefined || modification.removedMileage === ''
                      ? null
                      : Math.floor(Number(modification.removedMileage)),
                },
              }
            : undefined,
      },
      include: {
        modifications: true,
        media: true,
      },
    })

    const modificationId = logEntry.modifications[0]?.id ?? null

    const createdDocs = []
    for (const d of preparedDocs) {
      const visibility = parseElementVisibilityOrDefault(d.visibility, 'SELF')
      const attachTo =
        d.attachTo || (type === 'MODIFICATION' ? 'MODIFICATION' : 'CAR')

      const doc = await tx.document.create({
        data: {
          ownerId: session.user.id,
          carId,
          modificationId: attachTo === 'MODIFICATION' ? modificationId : null,
          type: d.type.trim().toUpperCase(),
          status: 'UPLOADED',
          title: d.title ?? null,
          issuer: d.issuer ?? null,
          documentNumber: d.documentNumber ?? null,
          url: d.url,
          visibility,
        },
        select: { id: true, type: true, url: true },
      })
      createdDocs.push(doc)

      const explicitApprovalType = (d.approvalType || '').trim().toUpperCase()
      const inferredApprovalType = d.type.trim().toUpperCase()
      const approvalTypeRaw =
        explicitApprovalType ||
        ((APPROVAL_TYPES as readonly string[]).includes(inferredApprovalType) ? inferredApprovalType : '')

      if (
        attachTo === 'MODIFICATION' &&
        modificationId &&
        (APPROVAL_TYPES as readonly string[]).includes(approvalTypeRaw)
      ) {
        const issueDate = parseOptionalDate(d.issueDate)
        const validUntil = parseOptionalDate(d.validUntil)
        await tx.approvalDocument.create({
          data: {
            modificationId,
            documentId: doc.id,
            approvalType: approvalTypeRaw,
            approvalNumber: d.approvalNumber ?? d.documentNumber ?? null,
            issuingAuthority: d.issuingAuthority ?? d.issuer ?? null,
            issueDate,
            validUntil,
          },
        })
      }
    }

    return { logEntry, createdDocs }
  })

  // Best-effort legality snapshot for the created modification (if any).
  const createdModificationId = created.logEntry?.modifications?.[0]?.id
  if (createdModificationId) {
    try {
      const updated = await recomputeAndPersistModificationLegality(createdModificationId)
      if (updated && (updated.legalityStatus === 'REGISTRATION_REQUIRED' || updated.legalityStatus === 'INSPECTION_REQUIRED')) {
        const title = `TUEV: Eintragung fuer ${updated.brand ? `${updated.brand} ` : ''}${updated.partName}`.trim()
        const existing = await prisma.buildTask.findFirst({
          where: {
            carId,
            title,
            status: { in: ['TODO', 'IN_PROGRESS'] },
          },
          select: { id: true },
        })
        if (!existing) {
          await prisma.buildTask.create({
            data: {
              carId,
              title,
              description:
                updated.legalityStatus === 'REGISTRATION_REQUIRED'
                  ? 'Teilegutachten/Eintragung: Termin bei TUEV/DEKRA/GTUE planen und Eintragung dokumentieren.'
                  : 'Einzelabnahme/Pruefung: Vorab abstimmen, Unterlagen sammeln und Ergebnis dokumentieren.',
              category: 'LEGAL',
              status: 'TODO',
              dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
        }
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json(
    {
      ...created.logEntry,
      documentsCreated: created.createdDocs.length,
    },
    { status: 201 }
  )
}
