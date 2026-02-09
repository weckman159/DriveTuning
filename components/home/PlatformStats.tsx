import type { HomeStats } from '@/lib/home-feed'
import { IconBarChart, IconCalendar, IconCar, IconStore } from '@/components/home/icons'

function formatNumberDe(input: number) {
  return input.toLocaleString('de-DE')
}

export default function PlatformStats(props: { stats: HomeStats }) {
  const stats = [
    { label: 'Public Builds', value: props.stats.publicBuilds, icon: IconCar, color: 'text-sky-300' },
    { label: 'Legal Mods', value: props.stats.legalMods, icon: IconBarChart, color: 'text-emerald-300' },
    { label: 'Active Listings', value: props.stats.activeListings, icon: IconStore, color: 'text-rose-300' },
    { label: 'Upcoming Events', value: props.stats.upcomingEvents, icon: IconCalendar, color: 'text-amber-300' },
  ] as const

  return (
    <div className="panel p-5">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">PLATFORM</div>
      <h3 className="mt-1 text-lg font-semibold text-white">DriveTuning in Zahlen</h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className={`inline-flex items-center gap-2 text-xs font-semibold ${s.color}`}>
                <Icon className="h-4 w-4" />
                {s.label}
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">{formatNumberDe(s.value)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
