'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  const mod = index % length
  return mod < 0 ? mod + length : mod
}

type Props = {
  open: boolean
  images: string[]
  initialIndex?: number
  alt?: string
  onClose: () => void
}

export default function ImageLightbox({ open, images, initialIndex = 0, alt = 'Bild', onClose }: Props) {
  const safeImages = useMemo(() => images.filter((u) => typeof u === 'string' && u.trim()), [images])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    if (safeImages.length === 0) {
      onClose()
      return
    }
    setIndex(wrapIndex(initialIndex, safeImages.length))
  }, [open, initialIndex, safeImages.length, onClose])

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
        return
      }
      if (safeImages.length <= 1) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIndex((i) => wrapIndex(i - 1, safeImages.length))
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIndex((i) => wrapIndex(i + 1, safeImages.length))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, safeImages.length])

  if (!open) return null

  const current = safeImages[wrapIndex(index, safeImages.length)]
  const showNav = safeImages.length > 1

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bildanzeige"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl h-[82vh] bg-zinc-950/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 p-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="text-xs text-zinc-200/90">
            {safeImages.length > 0 ? `${wrapIndex(index, safeImages.length) + 1} / ${safeImages.length}` : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm border border-white/10"
            aria-label="Schliessen"
          >
            Schliessen
          </button>
        </div>

        {showNav ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => wrapIndex(i - 1, safeImages.length))}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center"
              aria-label="Vorheriges Bild"
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => wrapIndex(i + 1, safeImages.length))}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center"
              aria-label="Naechstes Bild"
            >
              {'>'}
            </button>
          </>
        ) : null}

        <div className="relative w-full h-full">
          <Image
            src={current}
            alt={`${alt}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
            unoptimized={typeof current === 'string' && current.startsWith('data:')}
          />
        </div>
      </div>
    </div>
  )
}
