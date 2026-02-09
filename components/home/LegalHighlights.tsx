import Link from 'next/link'
import { IconAlertTriangle, IconShieldCheck, IconTrendingUp } from '@/components/home/icons'

export default function LegalHighlights() {
  return (
    <div className="panel overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600/30 to-sky-600/20 px-5 py-4">
        <div className="flex items-center gap-2 text-white">
          <IconShieldCheck className="h-5 w-5 text-emerald-300" />
          <h3 className="text-lg font-semibold">Warum Legalitaet zaehlt</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-200/85">DriveTuning ist ein Build Passport, kein Forum. Evidence und Genehmigungen sind Teil der Historie.</p>
      </div>

      <div className="p-5 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="h-5 w-5 text-amber-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Bussgelder vermeiden</div>
              <div className="mt-1 text-xs text-zinc-400">Illegale Teile koennen Stilllegung, Punkte oder hohe Strafen bedeuten.</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-start gap-3">
            <IconShieldCheck className="h-5 w-5 text-emerald-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Versicherung & Nachweise</div>
              <div className="mt-1 text-xs text-zinc-400">Dokumente (ABE, Teilegutachten, Eintragung) werden als Evidence im Build gespeichert.</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-start gap-3">
            <IconTrendingUp className="h-5 w-5 text-sky-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Resale Value</div>
              <div className="mt-1 text-xs text-zinc-400">Eine saubere Historie macht den Build besser verkaufbar und glaubwuerdiger.</div>
            </div>
          </div>
        </div>

        <Link
          href="/legal/haftungsausschluss"
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Haftungsausschluss lesen →
        </Link>
      </div>
    </div>
  )
}
