'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Car = {
  id: string
  make: string
  model: string
  generation: string | null
  year: number | null
  projectGoal: 'DAILY' | 'TRACK' | 'SHOW' | 'RESTORATION'
  currentMileage: number | null
  heroImage: string | null
}

type Garage = {
  id: string
  name: string
  region: string
  cars: Car[]
}

function QuickActionTile(props: { href: string; label: string; icon: ReactNode; iconToneClass: string }) {
  return (
    <Link
      href={props.href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 px-5 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${props.iconToneClass}`}>
        {props.icon}
      </div>
      <div className="mt-4 text-center text-[11px] font-semibold tracking-[0.22em] text-zinc-200">{props.label}</div>
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

  const goalLabel: Record<Car['projectGoal'], string> = {
    DAILY: 'Alltag',
    TRACK: 'Track',
    SHOW: 'Show',
    RESTORATION: 'Restauration',
  }

  const regions = useMemo(
    () => ['Berlin', 'Hamburg', 'Muenchen', 'Frankfurt', 'NRW', 'Schleswig-Holstein', 'Andere'],
    []
  )

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(60%_50%_at_50%_100%,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">Meine Garage</h1>
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
              <h2 className="text-xl font-bold text-white mb-1">Neue Garage</h2>
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
                  <select
                    value={newGarage.region}
                    onChange={(e) => setNewGarage({ ...newGarage, region: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-white"
                  >
                    <option value="">Region waehlen</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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
              <h2 className="text-xl font-bold text-white">Noch keine Garage</h2>
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl font-bold text-white">{garage.name}</h2>
                  <span className="text-zinc-700">•</span>
                  <span className="text-sm text-zinc-400">{garage.region || '—'}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-sm text-zinc-500">{garage.cars.length} Autos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {garage.cars.map((car) => (
                    <Link
                      key={car.id}
                      href={`/cars/${car.id}`}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-1 hover:border-white/20"
                    >
                      <div className="relative aspect-[4/3] bg-zinc-900/50">
                        {car.heroImage ? (
                          <Image
                            src={car.heroImage}
                            alt={`${car.make} ${car.model}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            unoptimized={typeof car.heroImage === 'string' && car.heroImage.startsWith('data:')}
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-zinc-600">400x300</div>
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
                            {goalLabel[car.projectGoal]}
                          </span>
                        </div>
                      </div>

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

                        <div className="mt-5 inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-white/10">
                          Details ansehen
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/90">
                            {'>'}
                          </span>
                        </div>
                      </div>
                    </Link>
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

