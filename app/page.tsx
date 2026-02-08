import Link from 'next/link'
import LandingNeonCar from '@/components/LandingNeonCar'

export default function Home() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.10),transparent_60%),radial-gradient(60%_50%_at_50%_100%,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="mx-auto max-w-6xl py-10 sm:py-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-zinc-200">
            DRIVETUNING
            <span className="text-zinc-600">•</span>
            BUILD PASSPORT
          </div>

          <h1 className="mt-6 text-4xl sm:text-6xl font-black tracking-tight text-white text-balance">
            Builds dokumentieren.
            <span className="text-sky-300"> TUEV nachweisen.</span>
            <span className="text-zinc-300"> Mit Historie verkaufen.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-3xl mx-auto text-balance">
            Sieh sofort, was legal ist und was nicht. Teile deinen Build Passport, sammle Nachweise und bring Ordnung in dein Projekt.
          </p>
        </div>

        <div className="mt-10 sm:mt-12">
          <LandingNeonCar />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/garage"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
          >
            Loslegen
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Account erstellen
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="text-xs font-semibold tracking-[0.18em] text-zinc-400">BUILD PASSPORT</div>
            <div className="mt-1">Journal, Teile, Kosten, Dokumente. Alles an einem Ort.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="text-xs font-semibold tracking-[0.18em] text-zinc-400">LEGAL / ILLEGAL</div>
            <div className="mt-1">Markiere Teile, lade ABE/Eintragung hoch, teile Links.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="text-xs font-semibold tracking-[0.18em] text-zinc-400">MARKTPLATZ</div>
            <div className="mt-1">Verkaufe Teile direkt aus dem Build heraus.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
