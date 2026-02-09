const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const fs = require('node:fs');
const path = require('node:path');

const prisma = new PrismaClient();

function stableFingerprint(input) {
  const raw = String(input || '').trim().toLowerCase();
  // Very small deterministic hash for seed usage. Not security sensitive.
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `lr_${(h >>> 0).toString(16)}`;
}

async function seedLegalityReferenceFromJson() {
  const filePath = path.join(process.cwd(), 'data', 'reference', 'tuning-legality-de.json');
  if (!fs.existsSync(filePath)) {
    console.log('[seed] legality reference JSON missing, skip');
    return;
  }

  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const categories = Array.isArray(doc.categories) ? doc.categories : [];
  let inserted = 0;

  for (const cat of categories) {
    const categoryId = String(cat.id || '').trim();
    const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
    for (const sub of subs) {
      const subId = String(sub.id || '').trim() || null;
      const items = Array.isArray(sub.items) ? sub.items : [];
      for (const it of items) {
        const brand = String(it.brand || '').trim();
        const partName = String(it.model || '').trim();
        if (!brand || !partName || !categoryId) continue;

        const approvalType = String(it.approvalType || '').trim();
        const approvalNumber = it.approvalNumber ? String(it.approvalNumber).trim() : null;
        const vehicleCompatibility = it.vehicleCompatibility ? String(it.vehicleCompatibility).trim() : null;
        const sourceId = String(it.sourceId || '').trim() || 'manufacturer';
        const sourceUrl = it.sourceUrl ? String(it.sourceUrl).trim() : null;
        const restrictionsJson = Array.isArray(it.restrictions) ? JSON.stringify(it.restrictions) : null;
        const notesDe = it.notesDe ? String(it.notesDe) : null;
        const notesEn = it.notesEn ? String(it.notesEn) : null;
        const validFrom = it.validFrom ? new Date(String(it.validFrom)) : null;
        const validUntil = it.validUntil ? new Date(String(it.validUntil)) : null;

        const fpSource = [
          categoryId,
          subId || '',
          brand,
          partName,
          approvalType,
          approvalNumber || '',
          sourceId,
          sourceUrl || '',
        ].join('|');
        const fingerprint = stableFingerprint(fpSource);

        await prisma.legalityReference.upsert({
          where: { fingerprint },
          update: {
            brand,
            partName,
            category: categoryId,
            subcategory: subId,
            vehicleCompatibility,
            approvalType,
            approvalNumber,
            sourceId,
            sourceUrl,
            restrictionsJson,
            notesDe,
            notesEn,
            validFrom,
            validUntil,
            isSynthetic: false,
          },
          create: {
            fingerprint,
            brand,
            partName,
            category: categoryId,
            subcategory: subId,
            vehicleCompatibility,
            approvalType,
            approvalNumber,
            sourceId,
            sourceUrl,
            restrictionsJson,
            notesDe,
            notesEn,
            validFrom,
            validUntil,
            isSynthetic: false,
          },
        });
        inserted++;
      }
    }
  }

  console.log(`[seed] LegalityReference upserted: ${inserted}`);
}

async function main() {
  console.log('Seeding DRIVETUNING database...');

  const hashedPassword = await hash('drivetuning123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@drivetuning.de' },
    update: {
      name: 'Max Mustermann',
      password: hashedPassword,
      image: '/api/placeholder/150/150',
    },
    create: {
      email: 'demo@drivetuning.de',
      name: 'Max Mustermann',
      password: hashedPassword,
      image: '/api/placeholder/150/150',
    },
  });
  console.log('Created user:', user.email);

  await prisma.userPrivacySettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      hideGarageLocation: true,
      autoBlurPlates: true,
      showRealName: false,
      defaultCarVisibility: 'UNLISTED',
    },
  });

  const garage = await prisma.garage.upsert({
    where: { id: 'm-power-lab' },
    update: {
      userId: user.id,
      name: 'M-Power Lab',
      region: 'Schleswig-Holstein',
      isDefault: true,
    },
    create: {
      id: 'm-power-lab',
      userId: user.id,
      name: 'M-Power Lab',
      region: 'Schleswig-Holstein',
      isDefault: true,
    },
  });

  const m4 = await prisma.car.upsert({
    where: { id: 'm4-g82' },
    update: {},
    create: {
      id: 'm4-g82',
      slug: 'bmw-m4-g82-g82-2023',
      garageId: garage.id,
      make: 'BMW',
      model: 'M4 G82',
      generation: 'G82',
      year: 2023,
      engineCode: 'S58',
      factoryHp: 510,
      factoryWeight: 1700,
      projectGoal: 'TRACK',
      currentMileage: 65230,
      visibility: 'PUBLIC',
      heroImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    },
  });
  console.log('Created car:', m4.make, m4.model);

  await prisma.logEntry.upsert({
    where: { id: 'kw-v3' },
    update: {
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'KW V3 coilovers installed',
      description: 'Full track setup with top mounts',
      date: new Date('2025-12-15'),
      totalCostImpact: 2800,
    },
    create: {
      id: 'kw-v3',
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'KW V3 coilovers installed',
      description: 'Full track setup with top mounts',
      date: new Date('2025-12-15'),
      totalCostImpact: 2800,
    },
  });

  await prisma.logEntry.upsert({
    where: { id: 'akrapovic' },
    update: {
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'Akrapovic titanium exhaust',
      description: 'Titanium Evolution system with race downpipes',
      date: new Date('2025-11-01'),
      totalCostImpact: 4200,
    },
    create: {
      id: 'akrapovic',
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'Akrapovic titanium exhaust',
      description: 'Titanium Evolution system with race downpipes',
      date: new Date('2025-11-01'),
      totalCostImpact: 4200,
    },
  });

  await prisma.logEntry.upsert({
    where: { id: 'oil-service' },
    update: {
      carId: m4.id,
      type: 'MAINTENANCE',
      title: 'Oil service & inspection',
      description: 'OEM BMW oil, filters, and inspection',
      date: new Date('2025-10-15'),
      totalCostImpact: 350,
    },
    create: {
      id: 'oil-service',
      carId: m4.id,
      type: 'MAINTENANCE',
      title: 'Oil service & inspection',
      description: 'OEM BMW oil, filters, and inspection',
      date: new Date('2025-10-15'),
      totalCostImpact: 350,
    },
  });

  await prisma.modification.upsert({
    where: { id: 'kw-v3-mod' },
    update: {
      logEntryId: 'kw-v3',
      partName: 'KW V3 Coilover Kit',
      brand: 'KW Suspensions',
      category: 'SUSPENSION',
      price: 2800,
      tuvStatus: 'YELLOW_ABE',
    },
    create: {
      id: 'kw-v3-mod',
      logEntryId: 'kw-v3',
      partName: 'KW V3 Coilover Kit',
      brand: 'KW Suspensions',
      category: 'SUSPENSION',
      price: 2800,
      tuvStatus: 'YELLOW_ABE',
    },
  });

  await prisma.modification.upsert({
    where: { id: 'akrapovic-mod' },
    update: {
      logEntryId: 'akrapovic',
      partName: 'Titanium Evolution Exhaust',
      brand: 'Akrapovic',
      category: 'EXHAUST',
      price: 4200,
      tuvStatus: 'RED_RACING',
    },
    create: {
      id: 'akrapovic-mod',
      logEntryId: 'akrapovic',
      partName: 'Titanium Evolution Exhaust',
      brand: 'Akrapovic',
      category: 'EXHAUST',
      price: 4200,
      tuvStatus: 'RED_RACING',
    },
  });

  await seedLegalityReferenceFromJson();

  console.log('Seeding complete.');
  console.log('Demo credentials:');
  console.log('  Email: demo@drivetuning.de');
  console.log('  Password: drivetuning123');
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
