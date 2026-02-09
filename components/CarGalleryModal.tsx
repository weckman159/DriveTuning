'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

export type CarGalleryAlbum = {
  id: string
  title: string
  images: string[]
}

type Props = {
  open: boolean
  title: string
  albums: CarGalleryAlbum[]
  onClose: () => void
  onOpenLightbox: (images: string[], initialIndex: number) => void
}

export default function CarGalleryModal({ open, title, albums, onClose, onOpenLightbox }: Props) {
  const safeAlbums = useMemo(
    () =>
      (albums || [])
        .map((a) => ({ ...a, images: (a.images || []).filter((u) => typeof u === 'string' && u.trim()) }))
        .filter((a) => a.images.length > 0),
    [albums]
  )

  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setActiveId((prev) => prev || safeAlbums[0]?.id || '')
  }, [open, safeAlbums])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const active = safeAlbums.find((a) => a.id === activeId) || safeAlbums[0] || null

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[86vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-black/40 to-transparent p-5">
          <div className="min-w-0">
            <div className="text-xs text-zinc-400 tracking-[0.18em]">GALERIE</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">{title}</h2>
            <div className="mt-2 text-xs text-zinc-500">
              {safeAlbums.reduce((acc, a) => acc + a.images.length, 0)} Bilder in {safeAlbums.length} Alben
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
            aria-label="Schliessen"
          >
            Schliessen
          </button>
        </div>

        {safeAlbums.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">Keine Bilder vorhanden.</div>
        ) : (
          <div className="p-5">
            <div className="flex gap-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {safeAlbums.map((a) => {
                const active = a.id === activeId
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveId(a.id)}
                    className={[
                      'whitespace-nowrap px-3 py-2 rounded-2xl border text-sm font-semibold transition-colors',
                      active
                        ? 'border-sky-400/30 bg-sky-500/15 text-sky-100'
                        : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {a.title}
                    <span className="ml-2 text-[11px] text-zinc-400">({a.images.length})</span>
                  </button>
                )
              })}
            </div>

            {active ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {active.images.map((src, idx) => (
                  <button
                    key={`${active.id}:${src}`}
                    type="button"
                    onClick={() => onOpenLightbox(active.images, idx)}
                    className={[
                      'group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30',
                      'hover:border-sky-400/40 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.40)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
                    ].join(' ')}
                    aria-label="Bild oeffnen"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={src}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        unoptimized={typeof src === 'string' && src.startsWith('data:')}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
