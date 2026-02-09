import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LegalityContributionForm from '@/components/LegalityContributionForm'

export default async function ContributeLegalityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const mod = await prisma.modification.findFirst({
    where: {
      id: resolvedParams.id,
      logEntry: { car: { garage: { userId: session.user.id } } },
    },
    select: {
      id: true,
      partName: true,
      brand: true,
      category: true,
      logEntry: { select: { car: { select: { id: true, make: true, model: true, year: true } } } },
    },
  })

  if (!mod) return notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/cars/${mod.logEntry.car.id}`} className="text-sm text-zinc-300 hover:text-white">
          &larr; Zurueck zum Auto
        </Link>
      </div>

      <div className="panel p-5 space-y-2">
        <h1 className="text-2xl font-semibold text-white">Legality Beitrag (DE)</h1>
        <div className="text-sm text-zinc-300">
          Teil: <span className="text-white font-semibold">{mod.brand ? `${mod.brand} ` : ''}{mod.partName}</span>
        </div>
        <div className="text-sm text-zinc-400">
          Fahrzeug: {mod.logEntry.car.make} {mod.logEntry.car.model} {mod.logEntry.car.year || ''}
        </div>
        <div className="text-xs text-zinc-500">
          Hinweis: DriveTuning stellt technische Informationen bereit und ersetzt keine Pruefung durch TUEV/DEKRA/GTUE.
        </div>
      </div>

      <LegalityContributionForm modificationId={mod.id} />
    </div>
  )
}
