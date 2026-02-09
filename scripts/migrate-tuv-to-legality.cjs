/* eslint-disable no-console */

const { PrismaClient } = require('@prisma/client')

function norm(input) {
  return typeof input === 'string' ? input.trim().toUpperCase() : ''
}

function deriveLegalityFromTuv(tuvStatus) {
  const t = norm(tuvStatus)
  if (t === 'GREEN_REGISTERED') return 'FULLY_LEGAL'
  if (t === 'RED_RACING') return 'ILLEGAL'
  return 'UNKNOWN'
}

async function main() {
  const prisma = new PrismaClient()

  const mods = await prisma.modification.findMany({
    where: {
      OR: [{ legalityLastCheckedAt: null }, { legalityStatus: 'UNKNOWN' }],
    },
    select: { id: true, tuvStatus: true, legalityStatus: true, legalityLastCheckedAt: true },
    take: 5000,
  })

  let updated = 0
  for (const m of mods) {
    const next = deriveLegalityFromTuv(m.tuvStatus)
    if (!next) continue
    await prisma.modification.update({
      where: { id: m.id },
      data: {
        legalityStatus: next,
        legalityLastCheckedAt: new Date(),
      },
    })
    updated++
  }

  console.log(`[migrate-tuv] OK: updated=${updated} scanned=${mods.length}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[migrate-tuv] ERROR', err instanceof Error ? err.message : err)
  process.exit(1)
})

