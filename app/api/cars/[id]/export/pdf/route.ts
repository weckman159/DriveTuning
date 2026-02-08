import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { id } = await params
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
          modifications: true,
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
    green: car.logEntries.filter(e => e.modifications.some(m => m.tuvStatus === 'GREEN_REGISTERED')).length,
    yellow: car.logEntries.filter(e => e.modifications.some(m => m.tuvStatus === 'YELLOW_ABE')).length,
    red: car.logEntries.filter(e => e.modifications.some(m => m.tuvStatus === 'RED_RACING')).length,
  }

  // Generate HTML for PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${car.make} ${car.model} - Fahrzeughistorie</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
        .cover { text-align: center; padding: 80px 0; border-bottom: 3px solid #FF6B35; margin-bottom: 40px; }
        .cover h1 { font-size: 48px; margin-bottom: 10px; color: #1a1a1a; }
        .cover .subtitle { font-size: 24px; color: #666; margin-bottom: 20px; }
        .specs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
        .spec-item { padding: 15px; background: #f5f5f5; border-radius: 8px; }
        .spec-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .spec-value { font-size: 18px; font-weight: bold; }
        .section { margin-bottom: 40px; }
        .section h2 { font-size: 28px; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; margin-bottom: 20px; }
        .timeline { border-left: 3px solid #ddd; padding-left: 30px; }
        .entry { position: relative; padding-bottom: 30px; }
        .entry::before { content: ''; position: absolute; left: -39px; top: 5px; width: 15px; height: 15px; background: #FF6B35; border-radius: 50%; }
        .entry-date { font-size: 12px; color: #666; }
        .entry-title { font-size: 18px; font-weight: bold; margin: 5px 0; }
        .entry-type { display: inline-block; padding: 3px 10px; background: #e0e0e0; border-radius: 4px; font-size: 12px; }
        .tuv-summary { display: flex; gap: 20px; margin-top: 20px; }
        .tuv-badge { padding: 10px 20px; border-radius: 8px; color: white; font-weight: bold; }
        .tuv-green { background: #22c55e; }
        .tuv-yellow { background: #eab308; }
        .tuv-red { background: #ef4444; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>${car.make} ${car.model} ${car.generation || ''}</h1>
        <p class="subtitle">Fahrzeughistorie & Dokumentation</p>
        <p style="color: #FF6B35; font-weight: bold;">${car.year || 'k.A.'}</p>
      </div>

      <div class="specs">
        <div class="spec-item">
          <div class="spec-label">Motor</div>
          <div class="spec-value">${car.engineCode || 'k.A.'}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Werksleistung</div>
          <div class="spec-value">${car.factoryHp || 'k.A.'} hp</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Projektziel</div>
          <div class="spec-value">${car.projectGoal}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Aktueller Kilometerstand</div>
          <div class="spec-value">${car.currentMileage?.toLocaleString() || 0} km</div>
        </div>
      </div>

      <div class="section">
        <h2>TÜV-Uebersicht</h2>
        <p>Modifikationen nach Eintragungsstatus:</p>
        <div class="tuv-summary">
          <div class="tuv-badge tuv-green">TÜV OK: ${tuvSummary.green}</div>
          <div class="tuv-badge tuv-yellow">ABE: ${tuvSummary.yellow}</div>
          <div class="tuv-badge tuv-red">Racing: ${tuvSummary.red}</div>
        </div>
      </div>

      <div class="section">
        <h2>Modifikationsverlauf</h2>
        <div class="timeline">
          ${car.logEntries
            .filter(e => e.type === 'MODIFICATION')
            .map(entry => `
              <div class="entry">
                <div class="entry-date">${entry.date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div class="entry-title">${entry.title}</div>
                <span class="entry-type">${entry.type.replace('_', ' ')}</span>
                ${entry.modifications.length > 0 ? entry.modifications.map(m => `
                  <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    <strong>${m.brand || ''} ${m.partName}</strong> (${m.category}) - €${m.price || 0}
                  </div>
                `).join('') : ''}
              </div>
            `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Service- & Track-Historie</h2>
        <div class="timeline">
          ${car.logEntries
            .filter(e => e.type !== 'MODIFICATION')
            .map(entry => `
              <div class="entry">
                <div class="entry-date">${entry.date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div class="entry-title">${entry.title}</div>
                <span class="entry-type">${entry.type.replace('_', ' ')}</span>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="footer">
        <p>Erstellt von DRIVETUNING</p>
        <p>Dokument erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
      </div>
    </body>
    </html>
  `

  // In production, use puppeteer/pdfkit to generate actual PDF
  // For now, return HTML with PDF content-type
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${car.make}-${car.model}-historie.html"`,
    },
  })
}
