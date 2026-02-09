import Link from 'next/link'
import Image from 'next/image'
import type { HomeFeaturedBuild } from '@/lib/home-feed'
import { IconShieldCheck } from '@/components/home/icons'

function isDataUrl(input: string) {
  return input.startsWith('data:')
}

export default function FeaturedBuildCard(props: { featuredBuild: HomeFeaturedBuild | null }) {
  const featured = props.featuredBuild
  if (!featured?.car.slug) return null

  const buildUrl = `/build/${encodeURIComponent(featured.car.slug)}`
  const title = `${featured.car.make} ${featured.car.model}${featured.car.generation ? ` ${featured.car.generation}` : ''}`

  return (
    <div className="panel p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">AUTO DES TAGES</div>
        <IconShieldCheck className="h-4 w-4 text-emerald-400" />
      </div>

      <div className="mt-3">
        <Link href={buildUrl} className="text-lg font-extrabold tracking-tight text-white hover:text-sky-200">
          {title}
        </Link>
        <div className="mt-1 text-sm text-zinc-400">
          {featured.car.year ?? '—'} · {featured.car.projectGoal} · {featured.car.buildStatus}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[96px_1fr] gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {featured.car.heroImage ? (
            <Image
              src={featured.car.heroImage}
              alt={title}
              fill
              sizes="96px"
              unoptimized={isDataUrl(featured.car.heroImage)}
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Highlights</div>
          <div className="mt-2 space-y-1">
            {featured.highlights.slice(0, 3).map((h, idx) => (
              <div key={`${h.partName}_${idx}`} className="text-xs text-zinc-300 truncate">
                {h.brand ? `${h.brand} ` : ''}
                {h.partName}
              </div>
            ))}
            {featured.highlights.length === 0 ? <div className="text-xs text-zinc-500">Noch keine oeffentlichen Details.</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link href={buildUrl} className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400">
          Build ansehen
        </Link>
      </div>
    </div>
  )
}
