'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AnalyticsConsentBanner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)

  async function setConsent(consent: 'granted' | 'denied') {
    setBusy(true)
    try {
      const res = await fetch('/api/consent/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent }),
      })
      if (!res.ok) return
      setHidden(true)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (hidden) return null

  return (
    <div className="panel p-4 border border-white/10 bg-zinc-950/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Analyse fuer Share-Link</div>
          <div className="mt-1 text-xs text-zinc-400">
            Erlaubst du, dass der Besitzer dieses Links anonyme Aufrufe zaehlen kann (keine IP-Speicherung, nur gehashte Kennung)?
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => void setConsent('denied')}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white disabled:opacity-60"
          >
            Nein
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setConsent('granted')}
            className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white disabled:opacity-60"
          >
            Ja
          </button>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-zinc-500">
        Hinweis: Du kannst Tracking jederzeit deaktivieren, indem du den Link mit <code className="text-zinc-300">?no_track=1</code> oeffnest.
      </div>
    </div>
  )
}

