'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ImageLightbox from '@/components/ImageLightbox'
import CarGalleryModal, { type CarGalleryAlbum } from '@/components/CarGalleryModal'
import PlaceSuggestInput from '@/components/PlaceSuggestInput'

type Car = {
  id: string
  make: string
  model: string
  generation: string | null
  year: number | null
  projectGoal: 'DAILY' | 'TRACK' | 'SHOW' | 'RESTORATION'
  currentMileage: number | null
  heroImage: string | null
  frontImage?: string | null
  rearImage?: string | null
  interiorImage?: string | null
  documents?: {
    id: string
    type: string
    title: string | null
    documentNumber: string | null
    url: string
    uploadedAt: string
  }[]
}

type Garage = {
  id: string
  name: string
  region: string
  cars: Car[]
}

function isImageUrl(url: string) {
  const u = (url || '').toLowerCase()
  return (
    u.startsWith('data:image/') ||
    u.endsWith('.png') ||
    u.endsWith('.jpg') ||
    u.endsWith('.jpeg') ||
    u.endsWith('.webp') ||
    u.endsWith('.gif')
  )
}

function uniqStrings(items: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const it of items) {
    if (typeof it !== 'string') continue
    const s = it.trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function collectCarImages(car: Car) {
  const docImages = (car.documents || [])
    .map((d) => d.url)
    .filter((u) => typeof u === 'string' && u.trim().length > 0 && isImageUrl(u))

  return uniqStrings([car.heroImage, car.frontImage, car.rearImage, car.interiorImage, ...docImages])
}

function buildCarAlbums(car: Car): CarGalleryAlbum[] {
  const docImages = (car.documents || [])
    .map((d) => d.url)
    .filter((u) => typeof u === 'string' && u.trim().length > 0 && isImageUrl(u))

  const albums: CarGalleryAlbum[] = [
    { id: 'hero', title: 'Titelbild', images: uniqStrings([car.heroImage]) },
    { id: 'exterior', title: 'Aussen', images: uniqStrings([car.frontImage, car.rearImage]) },
    { id: 'interior', title: 'Innen', images: uniqStrings([car.interiorImage]) },
    { id: 'docs', title: 'Dokumente', images: uniqStrings(docImages) },
  ]

  return albums.filter((a) => a.images.length > 0)
}

function QuickActionTile(props: { href: string; label: string; icon: ReactNode; iconToneClass: string }) {
  return (
    <Link
      href={props.href}
      className={[
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35',
        'px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all',
        'hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-950/45',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${props.iconToneClass}`}>
          {props.icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.24em] text-zinc-200">{props.label}</div>
        </div>
        <div className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all group-hover:bg-white/10 group-hover:text-white">
          <span aria-hidden="true">{'>'}</span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [background:radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.06),transparent_60%)]" />
    </Link>
  )
}

export default function GaragePage() {
  const [showAddGarage, setShowAddGarage] = useState(false)
  const [newGarage, setNewGarage] = useState({ name: '', region: '' })
  const [garages, setGarages] = useState<Garage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteGarageId, setDeleteGarageId] = useState<string | null>(null)
  const [deleteGarageName, setDeleteGarageName] = useState<string>('')
  const [deletingGarage, setDeletingGarage] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxAlt, setLightboxAlt] = useState('Bild')
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryTitle, setGalleryTitle] = useState('Galerie')
  const [galleryAlbums, setGalleryAlbums] = useState<CarGalleryAlbum[]>([])

  async function loadGarages() {
    try {
      setLoading(true)
      const res = await fetch('/api/garages')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Garagen konnten nicht geladen werden')
      }
      const data = await res.json()
      setGarages(data.garages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGarages()
  }, [])

  const totalCars = garages.reduce((acc, g) => acc + g.cars.length, 0)
  const totalGarages = garages.length

  async function handleAddGarage(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const res = await fetch('/api/garages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGarage),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Garage konnte nicht erstellt werden')
      }
      setShowAddGarage(false)
      setNewGarage({ name: '', region: '' })
      await loadGarages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    }
  }

  function requestDeleteGarage(garage: Garage) {
    setError(null)
    setDeleteGarageId(garage.id)
    setDeleteGarageName(garage.name)
  }

  async function confirmDeleteGarage() {
    if (!deleteGarageId) return
    setError(null)
    setDeletingGarage(true)
    try {
      const res = await fetch(`/api/garages/${deleteGarageId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Garage konnte nicht geloescht werden')
      }
      setDeleteGarageId(null)
      setDeleteGarageName('')
      await loadGarages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setDeletingGarage(false)
    }
  }

  const goalLabel: Record<Car['projectGoal'], string> = {
    DAILY: 'Alltag',
    TRACK: 'Track',
    SHOW: 'Show',
    RESTORATION: 'Restauration',
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(60%_50%_at_50%_100%,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="max-w-6xl mx-auto space-y-10">
        <ImageLightbox
          open={lightboxOpen}
          images={lightboxImages}
          initialIndex={lightboxIndex}
          alt={lightboxAlt}
          onClose={() => setLightboxOpen(false)}
        />

        <CarGalleryModal
          open={galleryOpen}
          title={galleryTitle}
          albums={galleryAlbums}
          onClose={() => setGalleryOpen(false)}
          onOpenLightbox={(images, initialIndex) => {
            setLightboxImages(images)
            setLightboxAlt(galleryTitle)
            setLightboxIndex(initialIndex)
            setLightboxOpen(true)
          }}
        />

        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">Meine Garage</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              <span>{totalCars} Autos</span>
              <span className="text-zinc-700">•</span>
              <span>
                {totalGarages} {totalGarages === 1 ? 'Garage' : 'Garagen'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddGarage(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-lg leading-none">+</span>
            Garage hinzufuegen
          </button>
        </header>

        {showAddGarage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
              <h2 className="text-xl font-semibold text-white mb-1">Neue Garage</h2>
              <p className="text-sm text-zinc-400 mb-4">Erstelle eine neue Garage und fuege danach Autos hinzu.</p>
              <form onSubmit={handleAddGarage} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={newGarage.name}
                    onChange={(e) => setNewGarage({ ...newGarage, name: e.target.value })}
                    placeholder="z.B. Meine Garage"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Region</label>
                  <PlaceSuggestInput
                    type="state"
                    value={newGarage.region}
                    onChange={(value) => setNewGarage({ ...newGarage, region: value })}
                    placeholder="z.B. Bayern, Berlin, Nordrhein-Westfalen"
                    required
                    inputClassName="w-full px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddGarage(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-semibold transition-colors hover:bg-white/10"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 text-white font-semibold transition-colors hover:bg-sky-400"
                  >
                    Erstellen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteGarageId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
              <h2 className="text-xl font-semibold text-white mb-1">Garage loeschen?</h2>
              <p className="text-sm text-zinc-400">
                Diese Aktion kann nicht rueckgaengig gemacht werden. Autos und zugehoerige Daten werden mit geloescht.
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-zinc-500 mb-1">Garage</div>
                <div className="text-white font-semibold">{deleteGarageName || '—'}</div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (deletingGarage) return
                    setDeleteGarageId(null)
                    setDeleteGarageName('')
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-semibold transition-colors hover:bg-white/10 disabled:opacity-60"
                  disabled={deletingGarage}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteGarage()}
                  disabled={deletingGarage}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-500/25 bg-red-500/15 hover:bg-red-500/20 disabled:bg-red-500/10 text-red-100 font-semibold transition-colors"
                >
                  {deletingGarage ? 'Loesche...' : 'Loeschen'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionTile
            href="/market/new"
            label="TEIL VERKAUFEN"
            iconToneClass="border-rose-500/25 bg-rose-500/10 text-rose-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" />
                <path d="M7 7h.01" />
              </svg>
            }
          />
          <QuickActionTile
            href="/events"
            label="TRACKDAYS"
            iconToneClass="border-amber-500/25 bg-amber-500/10 text-amber-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22V4a2 2 0 0 1 2-2h12l-2 6 2 6H6" />
              </svg>
            }
          />
          <QuickActionTile
            href="/settings/profile"
            label="EINSTELLUNGEN"
            iconToneClass="border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21v-7" />
                <path d="M4 10V3" />
                <path d="M12 21v-9" />
                <path d="M12 8V3" />
                <path d="M20 21v-5" />
                <path d="M20 12V3" />
                <path d="M2 14h4" />
                <path d="M10 8h4" />
                <path d="M18 16h4" />
              </svg>
            }
          />
          <QuickActionTile
            href="/"
            label="STATISTIK"
            iconToneClass="border-sky-500/25 bg-sky-500/10 text-sky-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 15v-6" />
                <path d="M12 15V6" />
                <path d="M17 15v-9" />
              </svg>
            }
          />
        </div>

        <div className="space-y-12">
          {loading ? <div className="text-center text-zinc-400">Garagen werden geladen...</div> : null}

          {!loading && garages.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <h2 className="text-xl font-semibold text-white">Noch keine Garage</h2>
              <p className="mt-2 text-sm text-zinc-400">Erstelle deine erste Garage, um Autos zu verwalten.</p>
              <button
                type="button"
                onClick={() => setShowAddGarage(true)}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
              >
                Garage erstellen
              </button>
            </div>
          ) : null}

          {!loading &&
            garages.map((garage) => (
              <section key={garage.id} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                    <h2 className="text-xl font-semibold text-white truncate">{garage.name}</h2>
                    <span className="text-zinc-700">•</span>
                    <span className="text-sm text-zinc-400">{garage.region || '—'}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-sm text-zinc-500">{garage.cars.length} Autos</span>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestDeleteGarage(garage)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/15"
                      title="Garage loeschen"
                      aria-label="Garage loeschen"
                    >
                      Loeschen
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {garage.cars.map((car) => (
                    <div
                      key={car.id}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-1 hover:border-white/20"
                    >
                      {(() => {
                        const carImages = collectCarImages(car)
                        const cover =
                          car.heroImage ||
                          car.frontImage ||
                          (car.documents || []).map((d) => d.url).find((u) => typeof u === 'string' && u.trim() && isImageUrl(u)) ||
                          car.rearImage ||
                          car.interiorImage ||
                          null
                        const coverIndex = cover ? Math.max(0, carImages.indexOf(cover)) : 0

                        return (
                            <div className="relative bg-zinc-900/50">
                              <div className="absolute top-3 left-3 z-10">
                              <span className="inline-flex items-center rounded-full border border-sky-400 bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
                                {goalLabel[car.projectGoal]}
                              </span>
                            </div>

                            <div className="absolute top-3 right-3 z-10">
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-zinc-100 backdrop-blur">
                                <span aria-hidden="true">▦</span>
                                {carImages.length}
                              </span>
                            </div>

                            {cover ? (
                              <div className="aspect-[4/3] p-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxImages(carImages)
                                    setLightboxAlt(`${car.make} ${car.model}`)
                                    setLightboxIndex(coverIndex)
                                    setLightboxOpen(true)
                                  }}
                                  className="relative block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                                  title="In voller Groesse ansehen"
                                  aria-label="Bild oeffnen"
                                >
                                  <div
                                    className={[
                                      'relative h-full w-full overflow-hidden rounded-2xl',
                                      'border border-sky-400/20 bg-zinc-950/35',
                                      'shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_0_24px_rgba(56,189,248,0.10)]',
                                    ].join(' ')}
                                  >
                                    <Image
                                      src={cover}
                                      alt={`${car.make} ${car.model}`}
                                      fill
                                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.01]"
                                      priority={false}
                                      unoptimized={typeof cover === 'string' && cover.startsWith('data:')}
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                                  </div>
                                </button>
                              </div>
                            ) : (
                              <div className="relative aspect-[4/3] grid place-items-center text-zinc-600">
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-zinc-300">Keine Fotos</div>
                                  <div className="mt-1 text-xs text-zinc-500">Lade Dokumente/Bilder im Auto hoch.</div>
                                </div>
                              </div>
                            )}

                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          </div>
                        )
                      })()}

                      <div className="p-5">
                        <div className="text-xs text-zinc-500">{car.make.toUpperCase()}</div>
                        <div className="mt-1 text-xl font-extrabold tracking-tight text-white">
                          {car.model} {car.generation || ''}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                          <span>{car.year || '—'}</span>
                          <span className="text-zinc-700">•</span>
                          <span>{car.currentMileage != null ? `${car.currentMileage.toLocaleString()} km` : '— km'}</span>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Link
                            href={`/cars/${car.id}`}
                            className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-white/10"
                          >
                            Details ansehen
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/90">
                              {'>'}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const albums = buildCarAlbums(car)
                              setGalleryTitle(`${car.make} ${car.model}${car.generation ? ` ${car.generation}` : ''}`)
                              setGalleryAlbums(albums)
                              setGalleryOpen(true)
                            }}
                            disabled={collectCarImages(car).length === 0}
                            className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-white/5"
                            title="Alben-Galerie oeffnen"
                          >
                            Galerie
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/90">
                              {'▦'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Link
                    href={`/garage/${garage.id}/add-car`}
                    className="group relative grid place-items-center rounded-3xl border-2 border-dashed border-white/10 bg-zinc-950/20 p-8 text-center transition-colors hover:border-sky-500/40 hover:bg-zinc-950/40"
                  >
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-white transition-colors group-hover:border-sky-500/25 group-hover:bg-sky-500/10">
                      +
                    </div>
                    <div className="mt-4 text-sm font-semibold text-white">Auto hinzufuegen</div>
                    <div className="mt-1 text-xs text-zinc-500">Fuege ein neues Fahrzeug zu dieser Garage hinzu</div>
                  </Link>
                </div>
              </section>
            ))}
        </div>
      </div>
    </div>
  )
}
