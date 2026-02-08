import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseElementVisibilityOrDefault } from '@/lib/vocab'
import { persistDocumentDataUrl } from '@/lib/blob-storage'

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

  const { id } = await params
  const car = await prisma.car.findFirst({
    where: { id, garage: { userId: session.user.id } },
    select: { id: true },
  })
  if (!car) return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })

  const body = await req.json().catch(() => ({} as any))
  const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : 'OTHER'
  const title = typeof body.title === 'string' ? body.title.trim() : null
  const issuer = typeof body.issuer === 'string' ? body.issuer.trim() : null
  const documentNumber = typeof body.documentNumber === 'string' ? body.documentNumber.trim() : null
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

  return NextResponse.json({ document: doc }, { status: 201 })
}
