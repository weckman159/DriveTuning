'use client'

import { useEffect, useState } from 'react'
import QwenChat from '@/components/QwenChat'

export default function AiWidget() {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  useEffect(() => {
    if (!open) return
    setEverOpened(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-2xl',
          'border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm font-semibold text-white',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur',
          'hover:bg-zinc-950/85 hover:border-white/20',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
        ].join(' ')}
        aria-label="AI Chat oeffnen"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-200"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.22 4.22l1.42 1.42" />
            <path d="M18.36 18.36l1.42 1.42" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M4.22 19.78l1.42-1.42" />
            <path d="M18.36 5.64l1.42-1.42" />
            <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
          </svg>
        </span>
        AI
      </button>

      {/* Mobile overlay */}
      <div
        className={[
          'sm:hidden fixed inset-0 z-[95] transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="absolute inset-3 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">AI</div>
              <div className="text-lg font-bold tracking-tight text-white truncate">AUTOEXPERT</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
              aria-label="Schliessen"
            >
              Schliessen
            </button>
          </div>

          <div className="min-h-0 flex-1">
            {everOpened ? <QwenChat variant="widget" /> : null}
          </div>
        </div>
      </div>

      {/* Desktop panel */}
      <div
        className={[
          'hidden sm:block fixed bottom-5 right-5 z-[95] transition-all duration-200',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        <div className="w-[min(460px,calc(100vw-2.5rem))] h-[min(640px,calc(100vh-2.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/75 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">AI</div>
              <div className="text-lg font-bold tracking-tight text-white truncate">AUTOEXPERT</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
              aria-label="Schliessen"
            >
              Schliessen
            </button>
          </div>

          <div className="h-[calc(100%-57px)]">
            {everOpened ? <QwenChat variant="widget" /> : null}
          </div>
        </div>
      </div>
    </>
  )
}
