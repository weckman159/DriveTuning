import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { hideGarageLocation, autoBlurPlates, showRealName, defaultCarVisibility } = body

  const settings = await prisma.userPrivacySettings.upsert({
    where: { userId: session.user.id },
    update: {
      hideGarageLocation,
      autoBlurPlates,
      showRealName,
      defaultCarVisibility,
    },
    create: {
      userId: session.user.id,
      hideGarageLocation,
      autoBlurPlates,
      showRealName,
      defaultCarVisibility,
    },
  })

  return NextResponse.json({ success: true, settings })
}
