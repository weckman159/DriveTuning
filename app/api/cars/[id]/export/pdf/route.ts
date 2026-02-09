import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function formatDate(date: Date) {
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function legalityLabel(statusRaw: unknown) {
  const s = String(statusRaw || '').trim().toUpperCase()
  if (s === 'FULLY_LEGAL') return 'LEGAL'
  if (s === 'REGISTRATION_REQUIRED') return 'EINTRAGUNG'
  if (s === 'INSPECTION_REQUIRED') return 'PRUEFUNG'
  if (s === 'ILLEGAL') return 'RISIKO'
  return 'CHECK'
}

function euro(value: number | null | undefined) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `EUR ${n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

async function renderCarPdf(params: {
  car: any
  tuvSummary: { green: number; yellow: number; red: number }
  legalitySummary: {
    fullyLegal: number
    registrationRequired: number
    inspectionRequired: number
    illegal: number
    unknown: number
  }
}) {
  const { car, tuvSummary, legalitySummary } = params
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const A4: [number, number] = [595.28, 841.89]
  const margin = 48
  const contentWidth = A4[0] - margin * 2

  const title = `${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`.trim()

  const wrapText = (text: string, maxWidth: number, font: any, size: number) => {
    const words = String(text || '').split(/\s+/).filter(Boolean)
    if (words.length === 0) return ['']
    const lines: string[] = []
    let line = words[0]!
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next
      } else {
        lines.push(line)
        line = words[i]!
      }
    }
    lines.push(line)
    return lines
  }

  const drawCentered = (page: any, text: string, y: number, font: any, size: number, color: any) => {
    const w = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: margin + (contentWidth - w) / 2, y, size, font, color })
  }

  const cover = pdfDoc.addPage(A4)

  drawCentered(cover, title, A4[1] - 120, fontBold, 26, rgb(0.07, 0.07, 0.07))
  drawCentered(cover, 'Fahrzeughistorie & Dokumentation', A4[1] - 150, fontRegular, 12, rgb(0.33, 0.33, 0.33))
  drawCentered(cover, car.year ? String(car.year) : 'k.A.', A4[1] - 175, fontBold, 13, rgb(0.01, 0.52, 0.78))

  cover.drawLine({
    start: { x: margin, y: A4[1] - 195 },
    end: { x: A4[0] - margin, y: A4[1] - 195 },
    thickness: 2,
    color: rgb(0.01, 0.52, 0.78),
  })

  const box = (page: any, x: number, y: number, w: number, h: number, label: string, value: string) => {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.95, 0.96, 0.97) })
    page.drawText(label.toUpperCase(), { x: x + 12, y: y + h - 18, font: fontRegular, size: 8, color: rgb(0.42, 0.45, 0.49) })
    const v = value && String(value).trim() ? String(value).trim() : 'k.A.'
    page.drawText(v, { x: x + 12, y: y + 16, font: fontBold, size: 12, color: rgb(0.07, 0.07, 0.07) })
  }

  const gridTop = A4[1] - 285
  const colGap = 18
  const colW = (contentWidth - colGap) / 2
  const rowH = 54

  box(cover, margin, gridTop, colW, rowH, 'Motor', car.engineCode || 'k.A.')
  box(cover, margin + colW + colGap, gridTop, colW, rowH, 'Werksleistung', car.factoryHp ? `${car.factoryHp} hp` : 'k.A.')
  box(cover, margin, gridTop - rowH - 12, colW, rowH, 'Projektziel', car.projectGoal || 'k.A.')
  box(
    cover,
    margin + colW + colGap,
    gridTop - rowH - 12,
    colW,
    rowH,
    'Aktueller Kilometerstand',
    car.currentMileage != null ? `${Number(car.currentMileage).toLocaleString('de-DE')} km` : 'k.A.'
  )

  const tuvY = gridTop - 2 * (rowH + 12) - 26
  cover.drawText('TUEV-Uebersicht', { x: margin, y: tuvY, size: 15, font: fontBold, color: rgb(0.07, 0.07, 0.07) })
  cover.drawText('Modifikationen nach Eintragungsstatus:', {
    x: margin,
    y: tuvY - 18,
    size: 10,
    font: fontRegular,
    color: rgb(0.29, 0.32, 0.35),
  })

  const badgeW = (contentWidth - 16) / 3
  const badgeH = 34
  const badgeY = tuvY - 56
  const drawBadge = (x: number, label: string, count: number, color: any) => {
    cover.drawRectangle({ x, y: badgeY, width: badgeW, height: badgeH, color })
    const text = `${label}: ${count}`
    const textW = fontBold.widthOfTextAtSize(text, 10)
    cover.drawText(text, {
      x: x + (badgeW - textW) / 2,
      y: badgeY + 12,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
  }
  drawBadge(margin, 'TUEV OK', tuvSummary.green, rgb(0.09, 0.64, 0.29))
  drawBadge(margin + badgeW + 8, 'ABE', tuvSummary.yellow, rgb(0.79, 0.54, 0.02))
  drawBadge(margin + 2 * (badgeW + 8), 'Racing', tuvSummary.red, rgb(0.86, 0.16, 0.16))

  const legY = badgeY - 52
  cover.drawText('Legalitaet (Hinweis)', { x: margin, y: legY, size: 15, font: fontBold, color: rgb(0.07, 0.07, 0.07) })
  cover.drawText('Status-Signale basieren auf Nachweisen/Referenzen und ersetzen keine Pruefung.', {
    x: margin,
    y: legY - 18,
    size: 9,
    font: fontRegular,
    color: rgb(0.29, 0.32, 0.35),
  })

  const legBadgeW = (contentWidth - 16) / 5
  const legBadgeH = 30
  const legBadgeY = legY - 54
  const drawLegBadge = (x: number, label: string, count: number, color: any) => {
    cover.drawRectangle({ x, y: legBadgeY, width: legBadgeW, height: legBadgeH, color })
    const text = `${label} ${count}`
    const textW = fontBold.widthOfTextAtSize(text, 9)
    cover.drawText(text, {
      x: x + (legBadgeW - textW) / 2,
      y: legBadgeY + 10,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
  }
  drawLegBadge(margin, 'LEGAL', legalitySummary.fullyLegal, rgb(0.09, 0.64, 0.29))
  drawLegBadge(margin + (legBadgeW + 4), 'EINTR.', legalitySummary.registrationRequired, rgb(0.79, 0.54, 0.02))
  drawLegBadge(margin + 2 * (legBadgeW + 4), 'PRUEF.', legalitySummary.inspectionRequired, rgb(0.97, 0.62, 0.15))
  drawLegBadge(margin + 3 * (legBadgeW + 4), 'RISIKO', legalitySummary.illegal, rgb(0.86, 0.16, 0.16))
  drawLegBadge(margin + 4 * (legBadgeW + 4), 'UNK', legalitySummary.unknown, rgb(0.45, 0.49, 0.55))

  // Timeline pages
  const addTimelinePage = (titleText: string) => {
    const page = pdfDoc.addPage(A4)
    let cursorY = A4[1] - margin
    page.drawText(titleText, { x: margin, y: cursorY - 18, size: 17, font: fontBold, color: rgb(0.07, 0.07, 0.07) })
    cursorY -= 32
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: A4[0] - margin, y: cursorY },
      thickness: 2,
      color: rgb(0.01, 0.52, 0.78),
    })
    cursorY -= 18
    return { page, cursorY }
  }

  const drawEntry = (state: { page: any; cursorY: number }, payload: { date: Date; title: string; type: string; lines?: string[] }) => {
    const minSpace = payload.lines && payload.lines.length > 0 ? 92 : 64
    if (state.cursorY < margin + minSpace) {
      state.page = pdfDoc.addPage(A4)
      state.cursorY = A4[1] - margin
    }

    const dateText = formatDate(payload.date)
    state.page.drawText(dateText, { x: margin, y: state.cursorY - 10, size: 8, font: fontRegular, color: rgb(0.42, 0.45, 0.49) })
    state.cursorY -= 22

    const tLines = wrapText(payload.title || '—', contentWidth, fontBold, 11)
    for (const line of tLines) {
      state.page.drawText(line, { x: margin, y: state.cursorY - 10, size: 11, font: fontBold, color: rgb(0.07, 0.07, 0.07) })
      state.cursorY -= 14
    }

    state.page.drawText(payload.type.replace('_', ' '), { x: margin, y: state.cursorY - 10, size: 8, font: fontRegular, color: rgb(0.22, 0.25, 0.29) })
    state.cursorY -= 18

    if (payload.lines && payload.lines.length > 0) {
      const boxPadding = 10
      const maxLineW = contentWidth - boxPadding * 2
      const wrapped: string[] = []
      for (const raw of payload.lines) wrapped.push(...wrapText(raw, maxLineW, fontRegular, 9))
      const boxH = boxPadding * 2 + wrapped.length * 12

      state.page.drawRectangle({
        x: margin,
        y: state.cursorY - boxH,
        width: contentWidth,
        height: boxH,
        color: rgb(0.98, 0.98, 0.99),
      })
      let y = state.cursorY - boxPadding - 10
      for (const line of wrapped) {
        state.page.drawText(line, { x: margin + boxPadding, y, size: 9, font: fontRegular, color: rgb(0.07, 0.07, 0.07) })
        y -= 12
      }
      state.cursorY -= boxH + 14
    }

    state.cursorY -= 8
  }

  let modState = addTimelinePage('Modifikationsverlauf')
  for (const entry of car.logEntries.filter((e: any) => e.type === 'MODIFICATION')) {
    const lines = (entry.modifications || []).map((m: any) => {
      const name = `${String(m.brand || '').trim()} ${m.partName}`.trim()
      const cat = m.category ? ` (${m.category})` : ''
      const price = euro(m.price)
      const leg = legalityLabel(m.legalityStatus)
      const an = String(m.legalityApprovalNumber || m.legalityApprovalType || '').trim()
      const approval = an ? ` · ${an}` : ''
      return `${name}${cat} - ${price} · ${leg}${approval}`
    })
    drawEntry(modState as any, { date: entry.date, title: entry.title, type: entry.type, lines })
  }

  let svcState = addTimelinePage('Service- & Track-Historie')
  for (const entry of car.logEntries.filter((e: any) => e.type !== 'MODIFICATION')) {
    drawEntry(svcState as any, { date: entry.date, title: entry.title, type: entry.type })
  }

  const footerText = `Erstellt von DRIVETUNING • ${new Date().toLocaleDateString('de-DE')}`
  for (const p of pdfDoc.getPages()) {
    const w = fontRegular.widthOfTextAtSize(footerText, 8)
    p.drawText(footerText, { x: (A4[0] - w) / 2, y: 22, size: 8, font: fontRegular, color: rgb(0.42, 0.45, 0.49) })
  }

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const { id } = await params
    const format = new URL(req.url).searchParams.get('format')
    // Verify car belongs to user
    const car = await prisma.car.findFirst({
      where: {
        id,
        garage: { userId: session.user.id },
      },
      include: {
        garage: true,
        logEntries: {
          include: {
            modifications: {
              include: {
                documents: { select: { id: true, type: true, url: true, documentNumber: true, uploadedAt: true } },
                approvalDocuments: { select: { id: true, approvalType: true, approvalNumber: true } },
                legalityReference: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!car) {
      return NextResponse.json({ error: 'Auto nicht gefunden' }, { status: 404 })
    }

    // Calculate TÜV summary
    const tuvSummary = {
      green: car.logEntries.filter((e) => e.modifications.some((m) => m.tuvStatus === 'GREEN_REGISTERED')).length,
      yellow: car.logEntries.filter((e) => e.modifications.some((m) => m.tuvStatus === 'YELLOW_ABE')).length,
      red: car.logEntries.filter((e) => e.modifications.some((m) => m.tuvStatus === 'RED_RACING')).length,
    }

    const allMods = car.logEntries.flatMap((e) => e.modifications || [])
    const legalitySummary = {
      fullyLegal: allMods.filter((m) => String(m.legalityStatus || '').toUpperCase() === 'FULLY_LEGAL').length,
      registrationRequired: allMods.filter((m) => String(m.legalityStatus || '').toUpperCase() === 'REGISTRATION_REQUIRED').length,
      inspectionRequired: allMods.filter((m) => String(m.legalityStatus || '').toUpperCase() === 'INSPECTION_REQUIRED').length,
      illegal: allMods.filter((m) => String(m.legalityStatus || '').toUpperCase() === 'ILLEGAL').length,
      unknown: allMods.filter((m) => String(m.legalityStatus || '').toUpperCase() === 'UNKNOWN').length,
    }

    if (format && format.trim().toLowerCase() === 'json') {
      const legalityDocuments = allMods.flatMap((m: any) => {
        const docs = Array.isArray(m.documents) ? m.documents : []
        return docs
          .filter((d: any) => ['ABE', 'ABG', 'EBE', 'TEILEGUTACHTEN', 'EINZELABNAHME', 'EINTRAGUNG', 'ECE'].includes(String(d.type || '').toUpperCase()))
          .map((d: any) => ({
            id: d.id,
            type: d.type,
            url: d.url,
            documentNumber: d.documentNumber || null,
            uploadedAt: d.uploadedAt,
            modification: {
              id: m.id,
              partName: m.partName,
              brand: m.brand,
              legalityStatus: m.legalityStatus,
              legalityApprovalType: m.legalityApprovalType,
              legalityApprovalNumber: m.legalityApprovalNumber,
            },
          }))
      })

      return NextResponse.json({
        exportVersion: '2.0',
        exportedAt: new Date().toISOString(),
        car: {
          id: car.id,
          make: car.make,
          model: car.model,
          generation: car.generation,
          year: car.year,
          engineCode: car.engineCode,
          stateId: car.stateId || null,
          registrationPlate: car.registrationPlate || null,
          currentMileage: car.currentMileage ?? null,
        },
        tuvSummary,
        legalitySummary,
        logEntries: car.logEntries.map((e: any) => ({
          id: e.id,
          date: e.date,
          title: e.title,
          type: e.type,
          modifications: (e.modifications || []).map((m: any) => ({
            id: m.id,
            partName: m.partName,
            brand: m.brand,
            category: m.category,
            price: m.price,
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
          })),
        })),
        legalityDocuments,
      })
    }

    const pdf = await renderCarPdf({ car, tuvSummary, legalitySummary })
    const pdfBytes = new Uint8Array(pdf)

    const safeName = `${car.make}-${car.model}-${car.year || 'na'}`
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('GET /api/cars/[id]/export/pdf failed:', err)
    return NextResponse.json({ error: 'PDF konnte nicht erstellt werden' }, { status: 500 })
  }
}
