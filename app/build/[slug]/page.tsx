import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeViewerHash } from '@/lib/viewer-hash'

type ElementVisibility = 'NONE' | 'SELF' | 'LINK' | 'PUBLIC'

const ALL_ELEMENT_VISIBILITY: ElementVisibility[] = ['NONE', 'SELF', 'LINK', 'PUBLIC']

function allowedElementVisibility(input: {
  isOwner: boolean
  hasValidToken: boolean
}): ElementVisibility[] {
  if (input.isOwner) return ALL_ELEMENT_VISIBILITY
  if (input.hasValidToken) return ['LINK', 'PUBLIC']
  return ['PUBLIC']
}

function badge(status: string) {
  const map: Record<string, { label: string; cls: string; title: string }> = {
    GREEN_REGISTERED: { label: 'TÜV OK', cls: 'bg-green-500', title: 'eingetragen im Fahrzeugschein' },
    YELLOW_ABE: { label: 'ABE', cls: 'bg-yellow-500', title: 'ABE/E-Nummer vorhanden' },
    RED_RACING: { label: 'Racing', cls: 'bg-red-500', title: 'Nur Rennstrecke/Export' },
  }
  const v = map[status]
  if (!v) return null
  return (
    <span className={`${v.cls} px-3 py-1 rounded-full text-xs font-medium`} title={v.title}>
      {v.label}
    </span>
  )
}

export const dynamic = 'force-dynamic'

export default async function BuildPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ token?: string }>
}) {
  const session = await getServerSession(authOptions)

  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const baseCar = await prisma.car.findFirst({
    where: { slug },
    select: {
      id: true,
      visibility: true,
      garage: { select: { userId: true } },
    },
  })

  if (!baseCar) notFound()

  const isOwner = Boolean(session?.user?.id && baseCar.garage.userId === session.user.id)
  const isPublic = baseCar.visibility === 'PUBLIC'
  const isUnlisted = baseCar.visibility === 'UNLISTED'
  const isPrivate = baseCar.visibility === 'PRIVATE'

  const rawToken = typeof resolvedSearchParams?.token === 'string' ? resolvedSearchParams.token.trim() : ''

  let shareLinkId: string | null = null
  if (!isOwner && !isPrivate && rawToken) {
    const share = await prisma.shareLink.findFirst({
      where: {
        token: rawToken,
        carId: baseCar.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, visibility: true },
    })
    if (share && share.visibility === 'READ_ONLY') {
      shareLinkId = share.id
    }
  }

  // Access rules:
  // - Owner can always view.
  // - Public builds are viewable without token.
  // - Unlisted builds require a valid share token for this car.
  // - Private builds are owner-only (never accessible via token).
  if (!isOwner) {
    if (isPrivate) notFound()
    if (isUnlisted && !shareLinkId) notFound()
    if (!isPublic && !isUnlisted) notFound()
  }

  const allowedVisibility = allowedElementVisibility({
    isOwner,
    hasValidToken: Boolean(shareLinkId),
  })

  const car = await prisma.car.findUnique({
    where: { id: baseCar.id },
    include: {
      tasks: {
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      },
      documents: {
        where: isOwner ? {} : { visibility: { in: allowedVisibility } },
        orderBy: { uploadedAt: 'desc' },
      },
      logEntries: {
        where: isOwner ? {} : { visibility: { in: allowedVisibility } },
        include: { modifications: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!car) notFound()

  // Consent log: only for token-based access (not for owner, not for generic public views).
  if (!isOwner && shareLinkId) {
    const h = await headers()
    const xff = h.get('x-forwarded-for') || ''
    const ip = xff.split(',')[0]?.trim() || null
    const ua = h.get('user-agent')
    const lang = h.get('accept-language')
    const viewerHash = computeViewerHash({ ip, userAgent: ua, acceptLanguage: lang })

    // If we don't have stable inputs, skip logging to avoid meaningless spam.
    if (viewerHash) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
      const recent = await prisma.shareLinkView.findFirst({
        where: { shareLinkId, viewerHash, viewedAt: { gt: tenMinAgo } },
        select: { id: true },
      })

      if (!recent) {
        await prisma.shareLinkView.create({
          data: {
            shareLinkId,
            viewerHash,
            userAgent: ua ? ua.slice(0, 256) : null,
          },
        })
      }
    }
  }

  const totalMods = car.logEntries.filter((e) => e.type === 'MODIFICATION').length
  const totalTrackDays = car.logEntries.filter((e) => e.type === 'TRACK_DAY').length
  const totalSpent = car.logEntries.reduce((acc, e) => acc + (Number(e.totalCostImpact) || 0), 0)

  return (
    <div className="space-y-8">
      <div className="relative h-80 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
        {car.heroImage ? (
          <Image
            src={car.heroImage}
            alt={car.make}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
            unoptimized={typeof car.heroImage === 'string' && car.heroImage.startsWith('data:')}
            priority
          />
        ) : (
          <div className="text-center">
            <span className="text-zinc-500 text-lg">Titelbild</span>
            <p className="text-zinc-600 text-sm mt-2">800×400</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-bold text-white">
              {car.make} {car.model} {car.generation || ''}
            </h1>
            <span className="px-3 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/50 text-sm font-medium rounded-full">
              {car.projectGoal}
            </span>
            <span className="px-3 py-1 bg-zinc-800/70 text-zinc-200 border border-zinc-700 text-sm font-medium rounded-full">
              {car.buildStatus}
            </span>
          </div>
          <p className="text-zinc-300">{car.currentMileage?.toLocaleString() || '—'} km</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <p className="text-sm text-zinc-400">Modifikationen</p>
          <p className="text-2xl font-bold text-white">{totalMods}</p>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <p className="text-sm text-zinc-400">Trackdays</p>
          <p className="text-2xl font-bold text-white">{totalTrackDays}</p>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <p className="text-sm text-zinc-400">Gesamt ausgegeben</p>
          <p className="text-2xl font-bold text-white">€{totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <p className="text-sm text-zinc-400">Leistung</p>
          <p className="text-2xl font-bold text-white">{car.factoryHp || '—'} hp</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Journal</h2>
        </div>

        <div className="space-y-4">
          {car.logEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-24 text-center">
                  <p className="text-sm text-zinc-400">
                    {new Date(entry.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-zinc-500">{new Date(entry.date).getFullYear()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 text-xs font-medium rounded text-white bg-zinc-700">
                      {String(entry.type).replace('_', ' ')}
                    </span>
                    {entry.modifications[0]?.tuvStatus ? badge(entry.modifications[0].tuvStatus) : null}
                    {entry.totalCostImpact ? (
                      <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded">
                        €{Number(entry.totalCostImpact).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-medium text-white">{entry.title}</h3>
                  {entry.description ? (
                    <p className="text-sm text-zinc-400 mt-1">{entry.description}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
          <h3 className="text-lg font-semibold text-white">Arbeitsplan</h3>
          <p className="text-sm text-zinc-400 mt-1">Nur fuer den Eigentuemer</p>
          <div className="mt-4 space-y-2">
            {car.tasks.length === 0 && <p className="text-zinc-400 text-sm">Noch keine Aufgaben.</p>}
            {car.tasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 bg-zinc-900/40 border border-zinc-700 rounded-lg p-3">
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-200">{t.status}</span>
                <span className={`text-white ${t.status === 'DONE' ? 'line-through opacity-70' : ''}`}>{t.title}</span>
                <span className="text-xs text-zinc-500">
                  {t.dueAt ? `Faellig: ${new Date(t.dueAt).toLocaleDateString('de-DE')}` : 'Kein Datum'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white">Dokumente</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {isOwner ? 'Eigentuemer-Ansicht' : shareLinkId ? 'Geteilt per Link' : 'Oeffentliche Nachweise'}
        </p>
        <div className="mt-4 space-y-2">
          {car.documents.length === 0 && (
            <p className="text-zinc-400 text-sm">{isOwner ? 'Noch keine Dokumente.' : 'Keine Dokumente freigegeben.'}</p>
          )}
          {car.documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 bg-zinc-900/40 border border-zinc-700 rounded-lg p-3">
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-200">{d.type}</span>
              {isOwner ? (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-700/60 text-zinc-200">{d.visibility}</span>
              ) : null}
              <span className="text-white">{d.title || d.documentNumber || d.url}</span>
              <span className="text-xs text-zinc-500">{new Date(d.uploadedAt).toLocaleDateString('de-DE')}</span>
              <a className="text-sky-400 hover:text-sky-300 text-sm break-all" href={d.url} target="_blank" rel="noreferrer">
                Oeffnen
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
