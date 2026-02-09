'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type EventItem = {
  id: string
  title: string
  description: string | null
  dateStart: string
  dateEnd: string | null
  locationRegion: string
  locationName: string
  brandFilter: string | null
  status: 'UPCOMING' | 'ACTIVE' | 'PAST'
}

export default function EventsPage() {
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [selectedLocation, setSelectedLocation] = useState('All')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true)
        const res = await fetch('/api/events')
        const data = await res.json()
        setEvents(data.events || [])
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  const regions = useMemo(() => {
    const values = Array.from(new Set(events.map(e => e.locationRegion))).sort()
    return ['All', ...values]
  }, [events])

  const brands = useMemo(() => {
    const values = Array.from(new Set(events.map(e => e.brandFilter).filter(Boolean) as string[])).sort()
    return ['All', ...values, 'All Brands']
  }, [events])

  const locations = useMemo(() => {
    const values = Array.from(new Set(events.map(e => e.locationName))).sort()
    return ['All', ...values]
  }, [events])

  const filteredEvents = events.filter((event) => {
    if (selectedRegion !== 'All' && event.locationRegion !== selectedRegion) return false
    if (selectedBrand !== 'All' && selectedBrand !== 'All Brands' && event.brandFilter !== selectedBrand) return false
    if (selectedLocation !== 'All' && event.locationName !== selectedLocation) return false
    if (selectedDay !== null) {
      const day = new Date(event.dateStart).getDate()
      if (day !== selectedDay) return false
    }
    return true
  })

  const upcomingCount = events.filter((e) => e.status === 'UPCOMING').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Events</h1>
          <p className="text-zinc-400 mt-1">
            {upcomingCount} kommende {upcomingCount === 1 ? 'Veranstaltung' : 'Veranstaltungen'}
          </p>
        </div>
        <Link
          href="/events/new"
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
        >
          + Event erstellen
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10 text-white"
        >
          {regions.map((region) => (
            <option key={region} value={region}>
              {region === 'All' ? 'Alle Regionen' : region}
            </option>
          ))}
        </select>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10 text-white"
        >
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand === 'All' || brand === 'All Brands' ? 'Alle Marken' : brand}
            </option>
          ))}
        </select>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10 text-white"
        >
          {locations.map((location) => (
            <option key={location} value={location}>
              {location === 'All' ? 'Alle Orte' : location}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center text-zinc-400">Events werden geladen...</div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="aspect-[2/1] bg-zinc-900/50 flex items-center justify-center relative">
                <span className="text-zinc-500">Event-Banner</span>
                {event.brandFilter && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/50 text-sm font-medium rounded-full">
                      {event.brandFilter}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>
                    {new Date(event.dateStart).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span>{event.locationRegion}</span>
                </div>
                <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {event.description || 'Keine Beschreibung vorhanden.'}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-zinc-500 text-sm">
                    <span>Offen</span>
                  </div>
                  <span className="text-sky-400 text-sm group-hover:underline">
                    Details ansehen →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">Keine Events gefunden</h3>
          <p className="text-zinc-400 mb-4">
            Passe deine Filter an oder erstelle dein eigenes Event.
          </p>
          <Link
            href="/events/new"
            className="inline-block px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
          >
            Event erstellen
          </Link>
        </div>
      )}

      {/* Calendar Preview */}
      <div className="panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Diesen Monat</h2>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="grid min-w-[28rem] grid-cols-7 gap-2 text-center">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
              <div key={day} className="p-2 text-zinc-500 text-sm font-medium">
                {day}
              </div>
            ))}
            {[...Array(31)].map((_, i) => {
              const day = i + 1
              const hasEvent = events.some((event) => new Date(event.dateStart).getDate() === day)
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`p-2 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-sky-500 text-white font-semibold'
                      : hasEvent
                        ? 'bg-sky-500/20 text-sky-400 font-semibold hover:bg-sky-500/30'
                        : 'text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
        {selectedDay !== null && (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>Gefiltert nach Tag: {selectedDay}</span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sky-400 hover:text-sky-300"
            >
              Tag-Filter entfernen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
