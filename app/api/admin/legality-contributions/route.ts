import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminSession } from '@/lib/admin'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  const contributions = await prisma.legalityContribution.findMany({
    where: { status: 'PENDING' },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      user: { select: { id: true, name: true, email: true } },
      modification: {
        select: {
          id: true,
          partName: true,
          brand: true,
          category: true,
          logEntry: { select: { car: { select: { id: true, make: true, model: true, year: true } } } },
        },
      },
    },
    take: 100,
  })

  return NextResponse.json({
    contributions: contributions.map((c) => ({
      id: c.id,
      approvalType: c.approvalType,
      approvalNumber: c.approvalNumber,
      inspectionOrg: c.inspectionOrg,
      inspectionDate: c.inspectionDate,
      notes: c.notes,
      status: c.status,
      isAnonymous: c.isAnonymous,
      hasDocuments: c.hasDocuments,
      createdAt: c.createdAt,
      user: c.user,
      modification: {
        id: c.modification.id,
        partName: c.modification.partName,
        brand: c.modification.brand,
        category: c.modification.category,
        car: c.modification.logEntry.car,
      },
    })),
  })
}

