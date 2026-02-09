import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import Image from 'next/image'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeViewerHash } from '@/lib/viewer-hash'
import AnalyticsConsentBanner from '@/components/AnalyticsConsentBanner'
import { computeTuvReadiness } from '@/lib/tuv-ready'

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
  searchParams?: Promise<{ token?: string; no_track?: string }>
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
  const noTrackRaw = typeof resolvedSearchParams?.no_track === 'string' ? resolvedSearchParams.no_track.trim() : ''
  const noTrack = noTrackRaw === '1' || noTrackRaw.toLowerCase() === 'true'

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
        include: {
          modifications: {
            include: {
              documents: { select: { type: true } },
              approvalDocuments: { select: { approvalType: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!car) notFound()

  const cookieStore = await cookies()
  const consentCookie = cookieStore.get('dt_analytics_consent')?.value || ''
  const consentGranted = consentCookie === 'granted'
  const consentDenied = consentCookie === 'denied'
  const shouldAskConsent = Boolean(!isOwner && shareLinkId && !noTrack && !consentGranted && !consentDenied)

  // Consent log: only for token-based access (not for owner, not for generic public views).
  if (!isOwner && shareLinkId && !noTrack && consentGranted) {
    const h = await headers()
    const xff = h.get('x-forwarded-for') || ''
    const ip = xff.split(',')[0]?.trim() || null
    const ua = h.get('user-agent')
    const lang = h.get('accept-language')
    const viewerHash = computeViewerHash({ ip, userAgent: ua, acceptLanguage: lang })

    // If we don't have stable inputs, skip logging to avoid meaningless spam.
    if (viewerHash) {
      const retentionDaysRaw = (process.env.SHARE_LINK_VIEW_RETENTION_DAYS || '').trim()
      const retentionDays = retentionDaysRaw ? Number(retentionDaysRaw) : 30
      if (Number.isFinite(retentionDays) && retentionDays > 0) {
        const cutoff = new Date(Date.now() - Math.floor(retentionDays) * 24 * 60 * 60 * 1000)
        await prisma.shareLinkView.deleteMany({
          where: { shareLinkId, viewedAt: { lt: cutoff } },
        })
      }

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
  const tuvReadiness = computeTuvReadiness(car.logEntries.flatMap((e) => e.modifications || []) as any)

  return (
    <div className="space-y-8">
      {shouldAskConsent ? <AnalyticsConsentBanner /> : null}
      <div className="relative h-80 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] flex items-center justify-center">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-semibold text-white">
              {car.make} {car.model} {car.generation || ''}
            </h1>
            <span className="px-3 py-1 bg-sky-500 text-white border border-sky-400 text-sm font-medium rounded-full">
              {car.projectGoal}
            </span>
            <span className="px-3 py-1 bg-zinc-950 text-white border border-white/15 text-sm font-medium rounded-full">
              {car.buildStatus}
            </span>
          </div>
          <p className="text-zinc-300">{car.currentMileage?.toLocaleString() || '—'} km</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="panel p-4">
          <p className="text-sm text-zinc-400">Modifikationen</p>
          <p className="text-2xl font-bold text-white">{totalMods}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-zinc-400">TUEV-Ready</p>
          <p className="text-2xl font-bold text-white">{tuvReadiness.score}%</p>
          <p className="mt-1 text-xs text-zinc-500">{tuvReadiness.status}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-zinc-400">Trackdays</p>
          <p className="text-2xl font-bold text-white">{totalTrackDays}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-zinc-400">Gesamt ausgegeben</p>
          <p className="text-2xl font-bold text-white">€{totalSpent.toLocaleString()}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-zinc-400">Leistung</p>
          <p className="text-2xl font-bold text-white">{car.factoryHp || '—'} hp</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-white">Journal</h2>
        </div>

        <div className="space-y-4">
          {car.logEntries.map((entry) => (
            <div
              key={entry.id}
              className="panel p-4"
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
                    <span className="px-2 py-0.5 text-xs font-medium rounded text-white border border-white/10 bg-white/5">
                      {String(entry.type).replace('_', ' ')}
                    </span>
                    {entry.modifications[0]?.tuvStatus ? badge(entry.modifications[0].tuvStatus) : null}
                    {entry.totalCostImpact ? (
                      <span className="px-2 py-0.5 border border-white/10 bg-white/5 text-zinc-200 text-xs rounded">
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
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-white">Arbeitsplan</h3>
          <p className="text-sm text-zinc-400 mt-1">Nur fuer den Eigentuemer</p>
          <div className="mt-4 space-y-2">
            {car.tasks.length === 0 && <p className="text-zinc-400 text-sm">Noch keine Aufgaben.</p>}
            {car.tasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 bg-zinc-950/30 border border-white/10 rounded-lg p-3">
                <span className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-200">{t.status}</span>
                <span className={`text-white ${t.status === 'DONE' ? 'line-through opacity-70' : ''}`}>{t.title}</span>
                <span className="text-xs text-zinc-500">
                  {t.dueAt ? `Faellig: ${new Date(t.dueAt).toLocaleDateString('de-DE')}` : 'Kein Datum'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-white">Dokumente</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {isOwner ? 'Eigentuemer-Ansicht' : shareLinkId ? 'Geteilt per Link' : 'Oeffentliche Nachweise'}
        </p>
        <div className="mt-4 space-y-2">
          {car.documents.length === 0 && (
            <p className="text-zinc-400 text-sm">{isOwner ? 'Noch keine Dokumente.' : 'Keine Dokumente freigegeben.'}</p>
          )}
          {car.documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 bg-zinc-950/30 border border-white/10 rounded-lg p-3">
              <span className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-200">{d.type}</span>
              {isOwner ? (
                <span className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-200">{d.visibility}</span>
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
