/* eslint-disable no-console */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')

function norm(input) {
  return String(input || '').trim()
}

function getFirst(row, keys) {
  for (const k of keys) {
    if (!k) continue
    const v = row[k]
    const s = norm(v)
    if (s) return s
  }
  return ''
}

function parseDateOrNull(input) {
  const raw = norm(input)
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function normalizeKbaApprovalNumber(raw) {
  const s = norm(raw)
  if (!s) return null

  // Common cases:
  // - "43234"          -> "KBA 43234"
  // - "KBA43234"       -> "KBA 43234"
  // - "KBA 43234"      -> "KBA 43234"
  // - "ABE 43234"      -> keep as-is (some exports use different labels)
  const compact = s.replace(/\s+/g, '')
  if (/^\d{3,8}$/.test(compact)) return `KBA ${compact}`
  if (/^KBA\d{3,8}$/i.test(compact)) return `KBA ${compact.slice(3)}`
  if (/^KBA\s*\d{3,8}$/i.test(s)) return `KBA ${s.replace(/[^0-9]/g, '')}`
  return s.replace(/\s+/g, ' ')
}

function stableFingerprint(parts) {
  const h = crypto.createHash('sha1').update(parts.join('|'), 'utf8').digest('hex')
  return `kba:${h.slice(0, 24)}`
}

async function main() {
  const prisma = new PrismaClient()
  const repoRoot = process.cwd()
  const filePath = path.join(repoRoot, 'data', 'reference', 'kba-abe-raw.json')
  if (!fs.existsSync(filePath)) {
    console.log(`[kba-abe->db] Missing file: ${path.relative(repoRoot, filePath)} (run npm run ref:kba-abe:import first)`)
    await prisma.$disconnect()
    process.exit(0)
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  if (!rows.length) {
    console.log('[kba-abe->db] No rows found (skip)')
    await prisma.$disconnect()
    process.exit(0)
  }

  const limitRaw = process.env.KBA_DB_UPSERT_LIMIT
  const limit = limitRaw ? Math.max(1, Math.min(20000, Number(limitRaw) || 0)) : 2000
  const sourceUrl = norm(payload?.sourceUrl) || null

  let upserted = 0
  let skipped = 0

  for (const row of rows.slice(0, limit)) {
    try {
      const manufacturer = getFirst(row, ['Hersteller', 'Herstellername', 'Manufacturer', 'Fabrikant']) || 'KBA'
      const partName =
        getFirst(row, ['Teilenummer', 'Teilnummer', 'Teile-Nummer', 'PartNumber', 'Bezeichnung', 'Artikel', 'Typ']) ||
        getFirst(row, ['Beschreibung', 'Description']) ||
        'Unknown part'

      const approvalRaw = getFirst(row, ['ABE-Nummer', 'ABE Nummer', 'ABE', 'ABE-Nr', 'KBA-Nummer', 'KBA Nummer', 'KBA'])
      const approvalNumber = normalizeKbaApprovalNumber(approvalRaw)
      const vehicleCompatibility = getFirst(row, ['Fahrzeugtyp', 'Fahrzeug', 'Fahrzeug Typ', 'Fahrzeugmodell', 'Vehicle']) || null

      const validFrom = parseDateOrNull(getFirst(row, ['Gültig ab', 'Gueltig ab', 'Valid from', 'GueltigAb']))
      const validUntil = parseDateOrNull(getFirst(row, ['Gültig bis', 'Gueltig bis', 'Valid until', 'GueltigBis']))

      const restrictionsText = getFirst(row, ['Einschränkungen', 'Einschraenkungen', 'Auflagen', 'Restrictions']) || null

      // KBA export does not classify into our product categories. Keep as "other".
      const category = 'other'
      const subcategory = null
      const approvalType = 'ABE'

      const fingerprint = stableFingerprint([
        normalizeKbaApprovalNumber(approvalNumber || '') || '',
        manufacturer.toLowerCase(),
        partName.toLowerCase(),
        vehicleCompatibility ? vehicleCompatibility.toLowerCase() : '',
      ])

      const restrictionsJson = JSON.stringify(
        {
          verification: {
            status: 'PRIMARY_SOURCE',
            note: 'Imported from a KBA-provided CSV export. Always confirm fitment/auflagen from the original document.',
          },
          restrictionsText,
          kbaRow: row,
        },
        null,
        0
      )

      await prisma.legalityReference.upsert({
        where: { fingerprint },
        update: {
          brand: manufacturer,
          partName,
          category,
          subcategory,
          vehicleCompatibility,
          approvalType,
          approvalNumber,
          sourceId: 'kba',
          sourceUrl,
          restrictionsJson,
          notesDe: null,
          notesEn: null,
          validFrom,
          validUntil,
          isSynthetic: false,
        },
        create: {
          fingerprint,
          brand: manufacturer,
          partName,
          category,
          subcategory,
          vehicleCompatibility,
          approvalType,
          approvalNumber,
          sourceId: 'kba',
          sourceUrl,
          restrictionsJson,
          notesDe: null,
          notesEn: null,
          validFrom,
          validUntil,
          isSynthetic: false,
        },
      })

      upserted++
    } catch (err) {
      skipped++
      if (skipped <= 5) {
        console.warn('[kba-abe->db] skip row:', err instanceof Error ? err.message : err)
      }
    }
  }

  console.log(`[kba-abe->db] OK: upserted=${upserted} skipped=${skipped} (limit=${Math.min(limit, rows.length)})`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[kba-abe->db] ERROR', err instanceof Error ? err.message : err)
  process.exit(1)
})

