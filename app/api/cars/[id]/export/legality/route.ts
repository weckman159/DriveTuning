import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function csvEscape(value: unknown) {
  const s = String(value ?? '')
  // Semicolon CSV (common in DE locales)
  return `"${s.replace(/"/g, '""')}"`
}

function toUpper(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'csv').trim().toLowerCase()

  const car = await prisma.car.findFirst({
    where: {
      id,
      garage: { userId: session.user.id },
    },
    include: {
      logEntries: {
        where: { type: 'MODIFICATION' },
        include: {
          modifications: {
            include: {
              legalityReference: true,
              documents: { select: { id: true, type: true, url: true, documentNumber: true, uploadedAt: true } },
              approvalDocuments: { select: { id: true, approvalType: true, approvalNumber: true } },
            },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  })

  if (!car) {
    return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
  }

  const mods = car.logEntries.flatMap((e) => e.modifications || [])
  const summary = {
    total: mods.length,
    fullyLegal: mods.filter((m) => toUpper((m as any).legalityStatus) === 'FULLY_LEGAL').length,
    registrationRequired: mods.filter((m) => toUpper((m as any).legalityStatus) === 'REGISTRATION_REQUIRED').length,
    inspectionRequired: mods.filter((m) => toUpper((m as any).legalityStatus) === 'INSPECTION_REQUIRED').length,
    illegal: mods.filter((m) => toUpper((m as any).legalityStatus) === 'ILLEGAL').length,
    unknown: mods.filter((m) => toUpper((m as any).legalityStatus) === 'UNKNOWN').length,
  }

  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    car: {
      id: car.id,
      make: car.make,
      model: car.model,
      generation: car.generation,
      year: car.year,
      stateId: (car as any).stateId || null,
      registrationPlate: (car as any).registrationPlate || null,
    },
    summary,
    modifications: mods.map((m: any) => {
      const docs = Array.isArray(m.documents) ? m.documents : []
      const approvals = Array.isArray(m.approvalDocuments) ? m.approvalDocuments : []
      return {
        id: m.id,
        installedAt: m.installedAt || null,
        installedMileage: m.installedMileage ?? null,
        partName: m.partName,
        brand: m.brand || null,
        category: m.category || null,
        price: m.price ?? null,
        tuvStatus: m.tuvStatus,
        evidenceScore: m.evidenceScore,
        legality: {
          status: m.legalityStatus,
          approvalType: m.legalityApprovalType || m.legalityReference?.approvalType || null,
          approvalNumber: m.legalityApprovalNumber || m.legalityReference?.approvalNumber || null,
          sourceId: m.legalitySourceId || m.legalityReference?.sourceId || null,
          sourceUrl: m.legalitySourceUrl || m.legalityReference?.sourceUrl || null,
          notes: m.legalityNotes || null,
        },
        documents: docs.map((d: any) => ({
          id: d.id,
          type: d.type,
          url: d.url,
          documentNumber: d.documentNumber || null,
          uploadedAt: d.uploadedAt,
        })),
        approvalDocuments: approvals.map((a: any) => ({
          id: a.id,
          approvalType: a.approvalType,
          approvalNumber: a.approvalNumber || null,
        })),
      }
    }),
  }

  if (format === 'json') {
    return NextResponse.json(exportData)
  }

  const headers = [
    'Datum',
    'Teil',
    'Marke',
    'Kategorie',
    'Legalitaetsstatus',
    'Genehmigungstyp',
    'Genehmigungsnummer',
    'Hinweise',
    'TUEV-Status',
    'Dokumente',
  ]
  const rows = exportData.modifications.map((m) => {
    const docFlags = (m.documents || []).length ? 'Ja' : 'Nein'
    const approvalType = m.legality.approvalType || '—'
    const approvalNumber = m.legality.approvalNumber || '—'
    return [
      m.installedAt ? new Date(m.installedAt).toLocaleDateString('de-DE') : '',
      m.partName,
      m.brand || '',
      m.category || '',
      m.legality.status || '',
      approvalType,
      approvalNumber,
      (m.legality.notes || '').replace(/\s+/g, ' ').trim(),
      m.tuvStatus || '',
      docFlags,
    ]
  })

  const csv = [headers.join(';'), ...rows.map((r) => r.map(csvEscape).join(';'))].join('\n') + '\n'

  const safeName = `${car.make}-${car.model}-${car.year || 'na'}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="legality-${safeName}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

