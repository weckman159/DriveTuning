import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PrivacySettingsForm from './PrivacySettingsForm'

type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE'

function normalizeVisibility(value: string | null | undefined): Visibility {
  if (value === 'PUBLIC' || value === 'PRIVATE' || value === 'UNLISTED') {
    return value
  }
  return 'UNLISTED'
}

async function getSettings(userId: string) {
  const settings = await prisma.userPrivacySettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    return {
      hideGarageLocation: true,
      autoBlurPlates: true,
      showRealName: false,
      defaultCarVisibility: 'UNLISTED' as const,
    }
  }

  return {
    hideGarageLocation: settings.hideGarageLocation,
    autoBlurPlates: settings.autoBlurPlates,
    showRealName: settings.showRealName,
    defaultCarVisibility: normalizeVisibility(settings.defaultCarVisibility),
  }
}

export default async function PrivacyPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const settings = await getSettings(session.user.id)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-semibold text-white">Datenschutz-Einstellungen</h1>

      <PrivacySettingsForm initialSettings={settings} />
    </div>
  )
}

