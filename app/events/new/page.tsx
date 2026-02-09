'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PlaceSuggestInput from '@/components/PlaceSuggestInput'

export default function NewEventPage() {
  const router = useRouter()
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
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [districtQuery, setDistrictQuery] = useState('')
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

      <h1 className="text-3xl font-semibold text-white">Event erstellen</h1>

      <form onSubmit={handleSubmit} className="space-y-6 p-6 panel">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Titel</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="input-base"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="textarea-base resize-none"
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
              className="input-base"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Enddatum</label>
            <input
              type="date"
              value={formData.dateEnd}
              onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
              className="input-base"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Region</label>
            <PlaceSuggestInput
              type="state"
              value={formData.locationRegion}
              onChange={(value) => {
                setFormData({ ...formData, locationRegion: value })
              }}
              onSelect={(s) => {
                setSelectedStateId((s.stateId || s.id || '').toString() || null)
                // Reset dependent fields
                setCityQuery('')
                setSelectedCityId(null)
                setDistrictQuery('')
                setFormData((prev) => ({ ...prev, locationName: '' }))
              }}
              placeholder="z.B. Bayern, Berlin, Nordrhein-Westfalen"
              required
              inputClassName="select-base"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Ort</label>
            <PlaceSuggestInput
              type="city"
              value={cityQuery}
              stateId={selectedStateId}
              onChange={(value) => {
                setCityQuery(value)
                // While typing, keep locationName aligned with city text (no district).
                setFormData((prev) => ({ ...prev, locationName: value }))
                setSelectedCityId(null)
                setDistrictQuery('')
              }}
              onSelect={(s) => {
                setCityQuery(s.value)
                setSelectedCityId(s.id || null)
                setDistrictQuery('')
                setFormData((prev) => ({ ...prev, locationName: s.value }))
              }}
              placeholder={selectedStateId ? 'Stadt suchen...' : 'Bitte zuerst Region waehlen'}
              required
              disabled={!selectedStateId}
              inputClassName="select-base"
            />
          </div>
        </div>

        {selectedCityId ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Bezirk (optional)</label>
            <PlaceSuggestInput
              type="district"
              value={districtQuery}
              cityId={selectedCityId}
              onChange={(value) => {
                setDistrictQuery(value)
                setFormData((prev) => ({ ...prev, locationName: cityQuery ? `${cityQuery}, ${value}` : value }))
              }}
              onSelect={(s) => {
                setDistrictQuery(s.value)
                setFormData((prev) => ({ ...prev, locationName: cityQuery ? `${cityQuery}, ${s.value}` : s.value }))
              }}
              placeholder="Bezirk suchen..."
              inputClassName="select-base"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Markenfilter (optional)</label>
          <select
            value={formData.brandFilter}
            onChange={(e) => setFormData({ ...formData, brandFilter: e.target.value })}
            className="select-base"
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
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors"
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
