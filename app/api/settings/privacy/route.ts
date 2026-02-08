import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCarVisibility, type CarVisibility } from '@/lib/vocab'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))

  const hideGarageLocationRaw = (body as any).hideGarageLocation
  const autoBlurPlatesRaw = (body as any).autoBlurPlates
  const showRealNameRaw = (body as any).showRealName
  const defaultCarVisibilityRaw = (body as any).defaultCarVisibility

  if (hideGarageLocationRaw !== undefined && typeof hideGarageLocationRaw !== 'boolean') {
    return NextResponse.json({ error: 'Ungueltiger Wert: hideGarageLocation' }, { status: 400 })
  }
  if (autoBlurPlatesRaw !== undefined && typeof autoBlurPlatesRaw !== 'boolean') {
    return NextResponse.json({ error: 'Ungueltiger Wert: autoBlurPlates' }, { status: 400 })
  }
  if (showRealNameRaw !== undefined && typeof showRealNameRaw !== 'boolean') {
    return NextResponse.json({ error: 'Ungueltiger Wert: showRealName' }, { status: 400 })
  }

  const hideGarageLocation: boolean | undefined =
    hideGarageLocationRaw === undefined ? undefined : hideGarageLocationRaw
  const autoBlurPlates: boolean | undefined =
    autoBlurPlatesRaw === undefined ? undefined : autoBlurPlatesRaw
  const showRealName: boolean | undefined =
    showRealNameRaw === undefined ? undefined : showRealNameRaw

  let defaultCarVisibility: CarVisibility | undefined
  if (defaultCarVisibilityRaw !== undefined) {
    const parsed = parseCarVisibility(defaultCarVisibilityRaw)
    if (!parsed) {
      return NextResponse.json({ error: 'Ungueltige Standard-Sichtbarkeit' }, { status: 400 })
    }
    defaultCarVisibility = parsed
  }

  const updateData = {
    ...(hideGarageLocation !== undefined ? { hideGarageLocation } : {}),
    ...(autoBlurPlates !== undefined ? { autoBlurPlates } : {}),
    ...(showRealName !== undefined ? { showRealName } : {}),
    ...(defaultCarVisibility !== undefined ? { defaultCarVisibility } : {}),
  }

  const createData = {
    userId: session.user.id,
    hideGarageLocation: hideGarageLocation === undefined ? true : hideGarageLocation,
    autoBlurPlates: autoBlurPlates === undefined ? true : autoBlurPlates,
    showRealName: showRealName === undefined ? false : showRealName,
    defaultCarVisibility: defaultCarVisibility ?? 'UNLISTED',
  }

  const settings = await prisma.userPrivacySettings.upsert({
    where: { userId: session.user.id },
    update: updateData,
    create: createData,
  })

  return NextResponse.json({ success: true, settings })
}

