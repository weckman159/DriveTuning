/* eslint-disable no-console */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')

function norm(input) {
  return String(input || '').trim()
}

function normUpper(input) {
  return norm(input).toUpperCase()
}

function toDateOrNull(input) {
  const raw = norm(input)
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function stableFingerprint(parts) {
  const h = crypto.createHash('sha1').update(parts.join('|'), 'utf8').digest('hex')
  return `verified:${h.slice(0, 24)}`
}

function parseEtFromSize(size) {
  const m = String(size || '').match(/ET\\s*(\\d{1,3})/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseMmFromRestriction(restrictions, label) {
  const list = Array.isArray(restrictions) ? restrictions : []
  for (const r of list) {
    const s = String(r || '')
    if (!s.toLowerCase().includes(label.toLowerCase())) continue
    const m = s.match(/(\\d{2,4})\\s*mm/i)
    if (m) return Number(m[1])
  }
  return null
}

function parseDbFromRestriction(restrictions) {
  const list = Array.isArray(restrictions) ? restrictions : []
  for (const r of list) {
    const s = String(r || '')
    const m = s.match(/(\\d{2,3})\\s*dB/i)
    if (m) return Number(m[1])
  }
  return null
}

function categoryConfigByFile(fileName) {
  if (fileName.includes('wheels')) return { category: 'wheels', subcategory: 'alloy_wheels' }
  if (fileName.includes('suspension')) return { category: 'suspension', subcategory: 'other' }
  if (fileName.includes('exhaust')) return { category: 'exhaust', subcategory: 'catback' }
  if (fileName.includes('brakes')) return { category: 'brakes', subcategory: 'big_brake_kit' }
  if (fileName.includes('ecu')) return { category: 'ecu', subcategory: 'power_box' }
  if (fileName.includes('interior')) return { category: 'interior', subcategory: 'other' }
  if (fileName.includes('safety')) return { category: 'safety', subcategory: 'other' }
  return { category: 'other', subcategory: null }
}

function buildCriticalParameters(fileName, entry) {
  const restrictions = Array.isArray(entry.restrictions) ? entry.restrictions : []
  const cp = {}

  const minClearanceLoaded = parseMmFromRestriction(restrictions, 'mindestbodenfreiheit')
  if (minClearanceLoaded) cp.minClearanceLoaded = minClearanceLoaded

  if (fileName.includes('brakes')) {
    const minWheelClearance = parseMmFromRestriction(restrictions, 'radfreigang')
    if (minWheelClearance) cp.minWheelClearance = minWheelClearance
  }

  if (fileName.includes('exhaust')) {
    const maxNoiseLevel = parseDbFromRestriction(restrictions)
    if (maxNoiseLevel) cp.maxNoiseLevel = maxNoiseLevel
  }

  return Object.keys(cp).length ? cp : null
}

async function main() {
  const prisma = new PrismaClient()
  const repoRoot = process.cwd()
  const files = [
    'verified-wheels-approvals.json',
    'verified-suspension-approvals.json',
    'verified-exhaust-approvals.json',
    'verified-brakes-approvals.json',
    'verified-ecu-approvals.json',
    'verified-interior-approvals.json',
    'verified-safety-approvals.json',
  ].map((f) => path.join(repoRoot, 'data', 'reference', f))

  const docs = files
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ filePath: p, fileName: path.basename(p), doc: JSON.parse(fs.readFileSync(p, 'utf8')) }))

  if (!docs.length) {
    console.log('[verified-approvals] No files found (skip)')
    await prisma.$disconnect()
    process.exit(0)
  }

  let upserted = 0
  let skipped = 0

  for (const { fileName, doc } of docs) {
    const cfg = categoryConfigByFile(fileName)
    const list = Array.isArray(doc.verifiedApprovals) ? doc.verifiedApprovals : []
    for (const entry of list) {
      try {
        const brand = norm(entry.brand)
        const model = norm(entry.model)
        const approvalType = normUpper(entry.approvalType)
        const approvalNumber = norm(entry.approvalNumber) || null
        const validFrom = toDateOrNull(entry.validFrom)
        const validUntil = toDateOrNull(entry.validUntil)
        const vehicles = Array.isArray(entry.vehicles) ? entry.vehicles.map((v) => norm(v)).filter(Boolean) : []
        const restrictions = Array.isArray(entry.restrictions) ? entry.restrictions.map((r) => norm(r)).filter(Boolean) : []
        const sourceUrl = norm(entry.sourceUrl) || null
        const documentUrl = norm(entry.documentUrl) || null
        const verification = entry.verification && typeof entry.verification === 'object' ? entry.verification : null

        if (!brand || !model || !approvalType) {
          skipped++
          continue
        }

        const criticalParameters = buildCriticalParameters(fileName, entry)
        const restrictionsJsonBase = {
          restrictions,
          criticalParameters,
          vehicles,
          source: { sourceUrl, documentUrl },
          verification,
          file: fileName,
          metadata: doc.metadata || null,
        }

        // Wheels: explode sizes into separate entries to make matching by partName practical.
        const sizes = Array.isArray(entry.sizes) ? entry.sizes.map((s) => norm(s)).filter(Boolean) : []
        const expanded = fileName.includes('wheels') && sizes.length ? sizes.map((s) => ({ size: s })) : [{ size: null }]

        for (const ex of expanded) {
          const size = ex.size
          const partName = size ? `${model} ${size}` : model
          const et = size ? parseEtFromSize(size) : null

          const fingerprint = stableFingerprint([
            fileName,
            cfg.category,
            brand.toLowerCase(),
            model.toLowerCase(),
            approvalNumber || '',
            size || '',
          ])

          const restrictionsJson = JSON.stringify(
            {
              ...restrictionsJsonBase,
              parameters: size ? { size, et } : null,
            },
            null,
            0
          )

          const vehicleCompatibility = vehicles.length ? vehicles.join('; ') : null
          const isSynthetic = true // until audited/verified against primary sources

          await prisma.legalityReference.upsert({
            where: { fingerprint },
            update: {
              brand,
              partName,
              category: cfg.category,
              subcategory: cfg.subcategory,
              vehicleCompatibility,
              approvalType,
              approvalNumber,
              sourceId: 'candidate',
              sourceUrl: sourceUrl || documentUrl,
              restrictionsJson,
              validFrom,
              validUntil,
              isSynthetic,
            },
            create: {
              fingerprint,
              brand,
              partName,
              category: cfg.category,
              subcategory: cfg.subcategory,
              vehicleCompatibility,
              approvalType,
              approvalNumber,
              sourceId: 'candidate',
              sourceUrl: sourceUrl || documentUrl,
              restrictionsJson,
              validFrom,
              validUntil,
              isSynthetic,
            },
          })

          upserted++
        }
      } catch (err) {
        skipped++
        if (skipped <= 5) {
          console.warn('[verified-approvals] skip:', err instanceof Error ? err.message : err)
        }
      }
    }
  }

  console.log(`[verified-approvals] OK: upserted=${upserted} skipped=${skipped}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[verified-approvals] ERROR', err instanceof Error ? err.message : err)
  process.exit(1)
})
