'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

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
  attendances?: {
    id: string
    user: { name: string | null }
    car: { make: string; model: string; generation: string | null }
  }[]
}

type CarItem = {
  id: string
  make: string
  model: string
  generation: string | null
}

export default function EventDetailPage() {
  const routeParams = useParams<{ id?: string | string[] }>()
  const eventId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id

  const [selectedCar, setSelectedCar] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE')
  const [event, setEvent] = useState<EventItem | null>(null)
  const [cars, setCars] = useState<CarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<'IDLE' | 'COPIED' | 'FAILED'>('IDLE')

  useEffect(() => {
    async function load() {
      if (!eventId) return
      try {
        setLoading(true)
        const [eventRes, garagesRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch('/api/garages'),
        ])
        if (!eventRes.ok) {
          const data = await eventRes.json().catch(() => ({}))
          throw new Error(data.error || 'Event nicht gefunden')
        }
        const eventData = await eventRes.json()
        setEvent(eventData.event)

        if (garagesRes.ok) {
          const garagesData = await garagesRes.json()
          const allCars = (garagesData.garages || []).flatMap((g: { cars: CarItem[] }) => g.cars)
          setCars(allCars)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  async function handleRSVP() {
    if (!selectedCar) return
    if (!eventId) return

    setStatus('LOADING')

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: selectedCar }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Anmeldung fehlgeschlagen')
      }
      setStatus('SUCCESS')
    } catch (error) {
      console.error(error)
      setStatus('IDLE')
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus('COPIED')
      setTimeout(() => setShareStatus('IDLE'), 2000)
    } catch {
      setShareStatus('FAILED')
      setTimeout(() => setShareStatus('IDLE'), 2000)
    }
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title || 'Event', url })
      } catch {
        setShareStatus('FAILED')
        setTimeout(() => setShareStatus('IDLE'), 2000)
      }
      return
    }
    await handleCopyLink()
  }

  const requirements = [
    'Track-Versicherung erforderlich',
    'Helm erforderlich',
    'Zugelassenes Fahrzeug',
  ]

  if (loading) {
    return <div className="text-center text-zinc-400">Event wird geladen...</div>
  }

  if (error || !event) {
    return (
      <div className="text-center text-zinc-400">
        {error || 'Event nicht gefunden'}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/events" className="hover:text-white transition-colors">
          Events
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{event.title}</span>
      </nav>

      {/* Event Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="aspect-[3/1] bg-zinc-900/50 flex items-center justify-center">
          <span className="text-zinc-500 text-lg">Event-Banner</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3 mb-2">
            {event.brandFilter && (
              <span className="px-3 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/50 text-sm font-medium rounded-full">
                {event.brandFilter}
              </span>
            )}
            <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 text-sm font-medium rounded-full">
              Kommend
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-zinc-300">
            <span className="flex items-center gap-1">
              📅 {new Date(event.dateStart).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              📍 {event.locationName}, {event.locationRegion}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Ueber dieses Event</h2>
            <p className="text-zinc-300 whitespace-pre-line">{event.description || 'Keine Beschreibung vorhanden.'}</p>
          </div>

          {/* Requirements */}
          <div className="panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Voraussetzungen</h2>
            <ul className="space-y-2">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-center gap-2 text-zinc-300">
                  <span className="text-sky-500">✓</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {/* The Grid */}
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Teilnehmer ({event.attendances?.length || 0})
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {(event.attendances || []).map((attendee) => (
                <div
                  key={attendee.id}
                  className="aspect-square bg-zinc-900/60 rounded-xl border border-white/10 flex flex-col items-center justify-center p-2 text-center"
                >
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1">
                    {(attendee.user.name || 'U')[0]}
                  </div>
                  <p className="text-xs text-white truncate w-full">
                    {attendee.car.make} {attendee.car.model}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {attendee.user.name || 'Mitglied'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - RSVP */}
        <div className="space-y-6">
          <div className="panel p-6 lg:sticky lg:top-4">
            <h3 className="text-lg font-semibold text-white mb-4">Anmelden</h3>

            {status === 'SUCCESS' ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-green-400 font-semibold mb-2">Du bist dabei.</p>
                <p className="text-zinc-400 text-sm">
                  Schau in deine E-Mails fuer Bestaetigung und Details.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Auto auswaehlen
                  </label>
                  <select
                    value={selectedCar}
                    onChange={(e) => setSelectedCar(e.target.value)}
                    className="select-base"
                  >
                    <option value="">Auto waehlen...</option>
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.make} {car.model} {car.generation}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRSVP}
                  disabled={!selectedCar || status === 'LOADING'}
                  className="w-full px-4 py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {status === 'LOADING' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Melde an...
                    </span>
                  ) : (
                    'Anmelden'
                  )}
                </button>

                <p className="text-xs text-zinc-500 text-center">
                  Kostenlose Stornierung bis 48 Stunden vor dem Event
                </p>
              </div>
            )}
          </div>

          {/* Organizer Info */}
          <div className="panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Veranstalter</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
                O
              </div>
              <div>
                <p className="font-semibold text-white">DRIVETUNING Events</p>
                <p className="text-sm text-zinc-400">Offizieller Partner</p>
              </div>
            </div>
          </div>

          {/* Share */}
          <div className="panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Event teilen</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 px-3 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Link kopieren
              </button>
              <button
                onClick={handleShare}
                className="flex-1 px-3 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Teilen
              </button>
            </div>
            {shareStatus === 'COPIED' && (
              <p className="text-green-400 text-xs mt-2">Link kopiert.</p>
            )}
            {shareStatus === 'FAILED' && (
              <p className="text-red-400 text-xs mt-2">Teilen fehlgeschlagen.</p>
            )}
          </div>
        </div>
      </div>

      {/* Back Link */}
      <Link href="/events" className="text-zinc-400 hover:text-white transition-colors">
        ← Alle Events
      </Link>
    </div>
  )
}
