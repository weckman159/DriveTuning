'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const regions = ['Nürburgring', 'Hockenheim', 'Berlin', 'Muenchen', 'Frankfurt', 'Hamburg', 'NRW']
  const locations = [
    'Nürburgring GP',
    'Nürburgring Nordschleife',
    'Hockenheimring',
    'Tempelhof Airport',
    'Olympiapark Munich',
    'Messe Frankfurt',
    'Hamburg Port',
  ]
  const brands = ['BMW', 'Audi', 'Porsche', 'Mercedes', 'Volkswagen', 'Ford']
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateStart: '',
    dateEnd: '',
    locationRegion: '',
    locationName: '',
    brandFilter: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Event konnte nicht erstellt werden')
      }

      router.push('/events')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="text-sm text-zinc-400">
        <Link href="/events" className="hover:text-white transition-colors">
          Events
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Event erstellen</span>
      </nav>

      <h1 className="text-3xl font-bold text-white">Event erstellen</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Titel</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white resize-none"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Startdatum</label>
            <input
              type="date"
              value={formData.dateStart}
              onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Enddatum</label>
            <input
              type="date"
              value={formData.dateEnd}
              onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Region</label>
            <select
              value={formData.locationRegion}
              onChange={(e) => setFormData({ ...formData, locationRegion: e.target.value })}
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="">Region waehlen</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Ort</label>
            <select
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="">Ort waehlen</option>
              {locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Markenfilter (optional)</label>
          <select
            value={formData.brandFilter}
            onChange={(e) => setFormData({ ...formData, brandFilter: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
          >
            <option value="">Alle Marken</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            href="/events"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Speichere...' : 'Event erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
