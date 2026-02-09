import Link from 'next/link'
import Image from 'next/image'
import type { HomeFeaturedBuild } from '@/lib/home-feed'
import { IconFileText, IconShieldCheck, IconWrench } from '@/components/home/icons'

function isDataUrl(input: string) {
  return input.startsWith('data:')
}

function formatDateDe(input: Date) {
  return input.toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: '2-digit' })
}

export default function HomeHero(props: { featuredBuild: HomeFeaturedBuild | null }) {
  const featured = props.featuredBuild
  const buildUrl = featured?.car.slug ? `/build/${encodeURIComponent(featured.car.slug)}` : null
  const image = featured?.car.heroImage ?? null

  return (
    <section className="panel overflow-hidden relative">
      <div className="absolute inset-0">
        {image ? (
          <Image
            src={image}
            alt={`${featured?.car.make ?? 'Build'} ${featured?.car.model ?? ''}`}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            unoptimized={isDataUrl(image)}
            className="object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_20%_10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(55%_40%_at_90%_30%,rgba(16,185,129,0.16),transparent_60%),linear-gradient(180deg,rgba(2,6,23,0.65),rgba(2,6,23,0.95))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />
        <div className="absolute inset-0 opacity-70 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.14),transparent_60%)]" />
      </div>

      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-white">
          <IconShieldCheck className="h-4 w-4 text-emerald-300" />
          FEATURED BUILD
        </div>

        <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-balance">
          {featured ? (
            <>
              {featured.car.make} {featured.car.model}
              {featured.car.generation ? ` ${featured.car.generation}` : ''}
              {featured.car.year ? ` (${featured.car.year})` : ''}
            </>
          ) : (
            <>Build Passport fuer legales Tuning in DE</>
          )}
        </h1>

        <p className="mt-4 max-w-3xl text-sm sm:text-base text-zinc-200/90 text-balance">
          {featured ? (
            <>
              {featured.car.projectGoal} · {featured.car.buildStatus}
              {featured.latestEntry ? ` · Letztes Update: ${formatDateDe(featured.latestEntry.date)}` : ''}
            </>
          ) : (
            <>Dokumentiere Modifikationen, Evidence und TUEV/ABE Status. Teile deinen Build als Public oder per Link.</>
          )}
        </p>

        {featured?.highlights?.length ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
            {featured.highlights.map((h, idx) => (
              <div key={`${h.partName}_${idx}`} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-zinc-200/90">
                  <IconWrench className="h-4 w-4 text-sky-200" />
                  {String(h.category).toUpperCase()}
                </div>
                <div className="mt-2 text-sm font-semibold text-white line-clamp-2">
                  {h.brand ? `${h.brand} ` : ''}
                  {h.partName}
                </div>
                <div className="mt-1 text-xs text-zinc-200/80 line-clamp-1">
                  {h.legalityApprovalNumber ? `Genehmigung: ${h.legalityApprovalNumber}` : `TUEV: ${h.tuvStatus}`}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {featured?.latestEntry ? (
          <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-zinc-300">
              <IconFileText className="h-4 w-4 text-zinc-200" />
              LATEST UPDATE
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{formatDateDe(featured.latestEntry.date)}</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{featured.latestEntry.title}</div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {buildUrl ? (
            <Link href={buildUrl} className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400">
              Build Passport ansehen
            </Link>
          ) : (
            <Link href="/signup" className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400">
              Kostenlos starten
            </Link>
          )}
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Dein Auto hinzufuegen
          </Link>
          <Link
            href="/legal/haftungsausschluss"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Rechtlicher Hinweis
          </Link>
        </div>
      </div>
    </section>
  )
}
