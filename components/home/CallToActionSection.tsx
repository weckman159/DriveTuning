import Link from 'next/link'
import { IconShieldCheck } from '@/components/home/icons'

export default function CallToActionSection() {
  return (
    <section className="mt-10 panel overflow-hidden">
      <div className="relative px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.14),transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-zinc-200">
            <IconShieldCheck className="h-4 w-4 text-emerald-300" />
            BUILD PASSPORT
          </div>

          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
            Dokumentiere dein Tuning. Beweise Legalitaet. Steigere Vertrauen.
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
            Starte kostenlos: Garage anlegen, Auto erfassen, Updates posten, Dokumente anhaengen. Teile deinen Build als PUBLIC oder per Share-Link.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400">
              Kostenlos starten
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Marketplace ansehen
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Events entdecken
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
