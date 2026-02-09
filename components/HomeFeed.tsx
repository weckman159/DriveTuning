import Link from 'next/link'
import { getHomeFeed, type HomeFeedFilter, type HomeFeedItem, type HomeUpcomingEvent } from '@/lib/home-feed'

function formatDateTimeDe(input: Date) {
  return input.toLocaleString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateDe(input: Date) {
  return input.toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: '2-digit' })
}

function badgeForTuvStatus(status: string | null) {
  if (!status) return null
  const map: Record<string, { label: string; cls: string; title: string }> = {
    GREEN_REGISTERED: { label: 'TUEV OK', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/25', title: 'eingetragen im Fahrzeugschein' },
    YELLOW_ABE: { label: 'ABE', cls: 'bg-amber-500/20 text-amber-200 border-amber-500/25', title: 'ABE/E-Nummer vorhanden' },
    RED_RACING: { label: 'ILLEGAL', cls: 'bg-rose-500/20 text-rose-200 border-rose-500/25', title: 'Nur Rennstrecke/Export' },
  }
  const v = map[status]
  if (!v) return null
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${v.cls}`} title={v.title}>
      {v.label}
    </span>
  )
}

function kindPill(kind: HomeFeedItem['kind']) {
  const map: Record<HomeFeedItem['kind'], { label: string; cls: string }> = {
    BUILD_UPDATE: { label: 'BUILD', cls: 'border-sky-500/25 bg-sky-500/15 text-sky-200' },
    LEGAL_SPOTLIGHT: { label: 'LEGAL', cls: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-200' },
    MARKET_LISTING: { label: 'MARKET', cls: 'border-rose-500/25 bg-rose-500/15 text-rose-200' },
  }
  const v = map[kind]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] ${v.cls}`}>
      {v.label}
    </span>
  )
}

function filterChip(label: string, value: HomeFeedFilter, active: boolean) {
  const href = value === 'all' ? '/' : `/?filter=${encodeURIComponent(value)}`
  return (
    <Link
      href={href}
      className={
        active
          ? 'inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200'
          : 'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10'
      }
    >
      {label}
    </Link>
  )
}

function FeedEmpty(props: { filter: HomeFeedFilter }) {
  const hint =
    props.filter === 'events'
      ? 'Aktuell keine Events. Erstelle eins oder schau spaeter nochmal rein.'
      : props.filter === 'market'
        ? 'Aktuell keine Listings. Erstelle ein Angebot oder schau spaeter nochmal rein.'
        : props.filter === 'legal'
          ? 'Noch keine oeffentlichen LEGAL/ILLEGAL Eintraege. Poste ein Update und setze den TUEV-Status.'
          : 'Noch keine oeffentlichen Updates. Stelle dein Build auf PUBLIC oder schau spaeter nochmal rein.'

  return (
    <div className="panel p-10 text-center">
      <div className="mx-auto max-w-xl">
        <div className="text-xs font-semibold tracking-[0.22em] text-zinc-400">FEED</div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Noch nichts zu sehen</h2>
        <p className="mt-2 text-sm text-zinc-400">{hint}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/garage" className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400">
            Zur Garage
          </Link>
          <Link href="/market/new" className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl btn-secondary px-6 py-3 text-sm font-semibold">
            Listing erstellen
          </Link>
        </div>
      </div>
    </div>
  )
}

function EventRail(props: { events: HomeUpcomingEvent[] }) {
  if (props.events.length === 0) return null
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">UPCOMING</div>
          <h2 className="mt-1 text-lg font-semibold text-white">Trackdays & Events</h2>
        </div>
        <Link href="/events" className="text-sm text-sky-300 hover:text-sky-200">
          Alle →
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {props.events.map((e) => (
          <Link
            key={e.id}
            href={`/events/${encodeURIComponent(e.id)}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{e.title}</div>
                <div className="mt-1 text-xs text-zinc-400 truncate">
                  {e.locationRegion} · {e.locationName}
                  {e.brandFilter ? ` · ${e.brandFilter}` : ''}
                </div>
              </div>
              <div className="text-xs font-semibold text-zinc-200 whitespace-nowrap">
                {formatDateDe(e.dateStart)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function FeedCard(props: { item: HomeFeedItem }) {
  const item = props.item

  if (item.kind === 'BUILD_UPDATE') {
    const url = item.car.slug ? `/build/${encodeURIComponent(item.car.slug)}` : null
    return (
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {kindPill(item.kind)}
            {badgeForTuvStatus(item.latestEntry?.modTuvStatus ?? null)}
          </div>
          <div className="text-xs text-zinc-500 whitespace-nowrap">{formatDateTimeDe(item.at)}</div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="sm:w-44 sm:flex-shrink-0">
            {item.car.heroImage ? (
              // Use <img> to avoid Next/Image domain constraints for user-uploaded URLs.
              <img
                src={item.car.heroImage}
                alt={`${item.car.make} ${item.car.model}`}
                className="h-28 w-full rounded-xl border border-white/10 object-cover bg-black/20"
                loading="lazy"
              />
            ) : (
              <div className="h-28 w-full rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-xs font-semibold tracking-[0.22em] text-zinc-300">
                {item.car.make} {item.car.model}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold tracking-tight text-white">
              {item.car.make} {item.car.model} {item.car.generation || ''}
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              {item.car.year ?? '—'} · {item.car.projectGoal} · {item.car.buildStatus}
            </div>

            {item.latestEntry ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                    {String(item.latestEntry.type).replace('_', ' ')}
                  </span>
                  {item.latestEntry.totalCostImpact ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                      EUR {Number(item.latestEntry.totalCostImpact).toLocaleString('de-DE')}
                    </span>
                  ) : null}
                  <span className="text-xs text-zinc-500">{formatDateDe(item.latestEntry.date)}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{item.latestEntry.title}</div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-zinc-400">Noch kein oeffentliches Update.</div>
            )}

            {url ? (
              <div className="mt-4">
                <Link href={url} className="text-sm text-sky-300 hover:text-sky-200">
                  Build Passport ansehen →
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (item.kind === 'LEGAL_SPOTLIGHT') {
    const url = item.car.slug ? `/build/${encodeURIComponent(item.car.slug)}` : null
    const legalText =
      item.tuvStatus === 'RED_RACING'
        ? 'NUR RENNSTRECKE'
        : item.tuvStatus === 'YELLOW_ABE'
          ? 'ABE / E-NUMMER'
          : 'EINGETRAGEN'

    return (
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {kindPill(item.kind)}
            {badgeForTuvStatus(item.tuvStatus)}
          </div>
          <div className="text-xs text-zinc-500 whitespace-nowrap">{formatDateTimeDe(item.at)}</div>
        </div>

        <div className="mt-3 text-sm text-zinc-400">
          {item.car.make} {item.car.model} {item.car.generation || ''} · {formatDateDe(item.entry.date)}
        </div>

        <div className="mt-3 text-xl font-bold tracking-tight text-white">{item.partName}</div>
        <div className="mt-1 text-sm text-zinc-300">
          {item.brand ? `${item.brand} · ` : ''}
          {item.category} · {legalText}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200">
            Docs: {item.documentCount}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200">
            {String(item.entry.type).replace('_', ' ')}
          </span>
        </div>

        {url ? (
          <div className="mt-4">
            <Link href={url} className="text-sm text-sky-300 hover:text-sky-200">
              Im Build ansehen →
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  // MARKET_LISTING
  const listingUrl = `/market/${encodeURIComponent(item.id.replace(/^listing_/, ''))}`
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {kindPill(item.kind)}
          {badgeForTuvStatus(item.tuvStatus)}
        </div>
        <div className="text-xs text-zinc-500 whitespace-nowrap">{formatDateTimeDe(item.at)}</div>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="w-28 flex-shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-20 w-28 rounded-xl border border-white/10 object-cover bg-black/20"
              loading="lazy"
            />
          ) : (
            <div className="h-20 w-28 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-[11px] font-semibold tracking-[0.22em] text-zinc-300">
              PART
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-white truncate">{item.title}</div>
          <div className="mt-1 text-sm text-zinc-400">
            EUR {item.price.toLocaleString('de-DE')} · {item.condition} · {item.status}
          </div>
          {item.car ? (
            <div className="mt-1 text-sm text-zinc-500 truncate">
              From: {item.car.make} {item.car.model} {item.car.generation || ''}
            </div>
          ) : null}
          <div className="mt-2 text-xs text-zinc-500">Evidence score: {item.evidenceScore}/100</div>
          <div className="mt-3">
            <Link href={listingUrl} className="text-sm text-sky-300 hover:text-sky-200">
              Listing oeffnen →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function HomeFeed(props: { filter: HomeFeedFilter }) {
  const { items, upcomingEvents } = await getHomeFeed({ filter: props.filter })

  const isEventsOnly = props.filter === 'events'

  const feedItems = isEventsOnly
    ? ([] as HomeFeedItem[])
    : items.filter((i) => {
        if (props.filter === 'all') return true
        if (props.filter === 'builds') return i.kind === 'BUILD_UPDATE'
        if (props.filter === 'legal') return i.kind === 'LEGAL_SPOTLIGHT'
        if (props.filter === 'market') return i.kind === 'MARKET_LISTING'
        return true
      })

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.10),transparent_60%),radial-gradient(60%_50%_at_50%_100%,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="mx-auto max-w-6xl py-10 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-zinc-200">
              DRIVETUNING
              <span className="text-zinc-600">|</span>
              FEED
            </div>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-balance">
              Live Updates. Legal Status. Parts. Trackdays.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-3xl text-balance">
              Alles, was du brauchst, um Interesse zu halten: oeffentliche Build-Updates, LEGAL/ILLEGAL Spots, frische Listings und kommende Events.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterChip('All', 'all', props.filter === 'all')}
            {filterChip('Builds', 'builds', props.filter === 'builds')}
            {filterChip('Legal', 'legal', props.filter === 'legal')}
            {filterChip('Market', 'market', props.filter === 'market')}
            {filterChip('Events', 'events', props.filter === 'events')}
          </div>
        </div>

        {isEventsOnly ? (
          <div className="mt-8 space-y-3">
            {upcomingEvents.length === 0 ? <FeedEmpty filter={props.filter} /> : <EventRail events={upcomingEvents} />}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-3">
              {feedItems.length === 0 ? <FeedEmpty filter={props.filter} /> : null}
              {feedItems.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
              <EventRail events={upcomingEvents} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
