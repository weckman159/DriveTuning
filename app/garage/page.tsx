'use client'

import { useEffect, useState } from 'react'
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

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Meine Garage</h1>
          <p className="text-zinc-400 mt-1">
            {totalCars} Autos • {totalGarages} {totalGarages === 1 ? 'Garage' : 'Garagen'}
          </p>
        </div>
        <button
          onClick={() => setShowAddGarage(true)}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
        >
          + Garage hinzufuegen
        </button>
      </div>

      {/* Add Garage Modal */}
      {showAddGarage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Neue Garage</h2>
            <form onSubmit={handleAddGarage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newGarage.name}
                  onChange={(e) => setNewGarage({ ...newGarage, name: e.target.value })}
                  placeholder="z.B. Meine Garage"
                  required
                  className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Region
                </label>
                <select
                  value={newGarage.region}
                  onChange={(e) => setNewGarage({ ...newGarage, region: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
                >
                  <option value="">Region waehlen</option>
                  <option value="Berlin">Berlin</option>
                  <option value="Hamburg">Hamburg</option>
                  <option value="Munich">Muenchen</option>
                  <option value="Frankfurt">Frankfurt</option>
                  <option value="NRW">NRW</option>
                  <option value="Schleswig-Holstein">Schleswig-Holstein</option>
                  <option value="Other">Andere</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddGarage(false)}
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/market/new"
          className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-sky-500 transition-colors text-center"
        >
          <div className="text-2xl mb-2">🚗</div>
          <p className="text-sm text-zinc-300">Teil verkaufen</p>
        </Link>
        <Link
          href="/events"
          className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-sky-500 transition-colors text-center"
        >
          <div className="text-2xl mb-2">🏁</div>
          <p className="text-sm text-zinc-300">Trackdays</p>
        </Link>
        <Link
          href="/settings/profile"
          className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-sky-500 transition-colors text-center"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <p className="text-sm text-zinc-300">Einstellungen</p>
        </Link>
        <Link
          href="/"
          className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-sky-500 transition-colors text-center"
        >
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-zinc-300">Statistik</p>
        </Link>
      </div>

      {/* Garages List */}
      <div className="space-y-12">
        {loading && (
          <div className="text-center text-zinc-400">Garagen werden geladen...</div>
        )}
        {!loading && garages.map((garage) => (
          <div key={garage.id} className="space-y-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-zinc-200">{garage.name}</h2>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">{garage.region}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{garage.cars.length} Autos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {garage.cars.map((car) => (
                <Link
                  key={car.id}
                  href={`/cars/${car.id}`}
                  className="group block bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-sky-500 hover:scale-105 transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-zinc-700 flex items-center justify-center relative">
                    {car.heroImage ? (
                      <Image
                        src={car.heroImage}
                        alt={`${car.make} ${car.model}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized={typeof car.heroImage === 'string' && car.heroImage.startsWith('data:')}
                      />
                    ) : (
                      <span className="text-zinc-500">400×300</span>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-xs font-medium bg-sky-500/20 text-sky-400 rounded">
                        {goalLabel[car.projectGoal]}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {car.make} {car.model} {car.generation}
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {car.year || '—'} • {car.currentMileage?.toLocaleString() || '—'} km
                    </p>
                  </div>
                </Link>
              ))}

              {/* Add Car Card */}
              <Link
                href={`/garage/${garage.id}/add-car`}
                className="group block bg-zinc-800/50 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-sky-500 transition-all duration-300 flex items-center justify-center aspect-[4/3]"
              >
                <div className="text-center p-4">
                  <div className="text-3xl mb-2 text-zinc-500 group-hover:text-sky-500 transition-colors">
                    +
                  </div>
                  <p className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                    Auto hinzufuegen
                  </p>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && garages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-white mb-2">Noch keine Garagen</h3>
          <p className="text-zinc-400 mb-4">
            Erstelle deine erste Garage, um deine Builds zu dokumentieren.
          </p>
          <button
            onClick={() => setShowAddGarage(true)}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
          >
            Garage erstellen
          </button>
        </div>
      )}
    </div>
  )
}
