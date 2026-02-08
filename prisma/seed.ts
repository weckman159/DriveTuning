import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding DRIVETUNING database...')

  // Test user
  const hashedPassword = await hash('drivetuning123', 12)
  
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
    }
  })
  console.log('✅ Created user:', user.email)

  // Privacy settings
  await prisma.userPrivacySettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      hideGarageLocation: true,
      autoBlurPlates: true,
      showRealName: false,
      defaultCarVisibility: 'UNLISTED'
    }
  })
  console.log('✅ Created privacy settings')

  // Garage
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
      isDefault: true
    }
  })
  console.log('✅ Created garage:', garage.name)

  // Cars
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
      heroImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'
    }
  })
  console.log('✅ Created car:', m4.make, m4.model)

  // Journal entries
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
  })
  await prisma.logEntry.upsert({
    where: { id: 'akrapovic' },
    update: {
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'Akrapovič titanium exhaust',
      description: 'Titanium Evolution system with race downpipes',
      date: new Date('2025-11-01'),
      totalCostImpact: 4200,
    },
    create: {
      id: 'akrapovic',
      carId: m4.id,
      type: 'MODIFICATION',
      title: 'Akrapovič titanium exhaust',
      description: 'Titanium Evolution system with race downpipes',
      date: new Date('2025-11-01'),
      totalCostImpact: 4200,
    },
  })
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
  })
  console.log('✅ Created journal entries')

  // Modifications
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
  })
  await prisma.modification.upsert({
    where: { id: 'akrapovic-mod' },
    update: {
      logEntryId: 'akrapovic',
      partName: 'Titanium Evolution Exhaust',
      brand: 'Akrapovič',
      category: 'EXHAUST',
      price: 4200,
      tuvStatus: 'RED_RACING',
    },
    create: {
      id: 'akrapovic-mod',
      logEntryId: 'akrapovic',
      partName: 'Titanium Evolution Exhaust',
      brand: 'Akrapovič',
      category: 'EXHAUST',
      price: 4200,
      tuvStatus: 'RED_RACING',
    },
  })
  console.log('✅ Created modifications')

  console.log('\n🎉 Seeding complete!')
  console.log('\nDemo credentials:')
  console.log('  Email: demo@drivetuning.de')
  console.log('  Password: drivetuning123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

