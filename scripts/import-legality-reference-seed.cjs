/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

function norm(input) {
  return String(input || '').trim();
}

function toDateOrNull(input) {
  const raw = norm(input);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function main() {
  const prisma = new PrismaClient();
  const repoRoot = process.cwd();
  const filePath = path.join(repoRoot, 'data', 'reference', 'legality-reference-seed.json');
  if (!fs.existsSync(filePath)) {
    console.log(`[legality-seed] Missing file: ${path.relative(repoRoot, filePath)} (skip)`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = Array.isArray(doc.items) ? doc.items : [];
  if (!items.length) {
    console.log('[legality-seed] No items found (skip)');
    await prisma.$disconnect();
    process.exit(0);
  }

  let upserted = 0;
  let skipped = 0;

  for (const it of items) {
    const externalId = norm(it.id);
    const brand = norm(it.brand);
    const partName = norm(it.partName);
    const category = norm(it.category);
    const subcategory = norm(it.subcategory) || null;
    const vehicleCompatibility = norm(it.vehicleCompatibility) || null;
    const approvalType = norm(it.approvalType);
    const approvalNumber = norm(it.approvalNumber) || null;
    const sourceId = norm(it.sourceId) || 'manufacturer';
    const sourceUrl = norm(it.sourceUrl) || null;
    const validFrom = toDateOrNull(it.validFrom);
    const validUntil = toDateOrNull(it.validUntil);

    const restrictions = Array.isArray(it.restrictions) ? it.restrictions : [];
    const criticalParameters = it.criticalParameters && typeof it.criticalParameters === 'object' ? it.criticalParameters : null;
    const verification = it.verification && typeof it.verification === 'object' ? it.verification : null;

    if (!externalId || !brand || !partName || !category || !approvalType) {
      skipped++;
      continue;
    }

    const fingerprint = `seed:${externalId}`;
    const restrictionsJson = JSON.stringify(
      {
        restrictions,
        criticalParameters,
        verification,
        seedMeta: doc.metadata || null,
      },
      null,
      0
    );

    await prisma.legalityReference.upsert({
      where: { fingerprint },
      update: {
        brand,
        partName,
        category,
        subcategory,
        vehicleCompatibility,
        approvalType,
        approvalNumber,
        sourceId,
        sourceUrl,
        restrictionsJson,
        notesDe: null,
        notesEn: null,
        validFrom,
        validUntil,
        isSynthetic: true,
      },
      create: {
        fingerprint,
        brand,
        partName,
        category,
        subcategory,
        vehicleCompatibility,
        approvalType,
        approvalNumber,
        sourceId,
        sourceUrl,
        restrictionsJson,
        notesDe: null,
        notesEn: null,
        validFrom,
        validUntil,
        isSynthetic: true,
      },
    });

    upserted++;
  }

  console.log(`[legality-seed] OK: upserted=${upserted} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[legality-seed] ERROR', err instanceof Error ? err.message : err);
  process.exit(1);
});

