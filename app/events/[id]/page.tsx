'use client'

import { useState } from 'react'
import Link from 'next/link'

// MOCK DATA - NO DATABASE
const mockEvent = {
  id: '1',
  title: 'BMW Track Day Nürburgring',
  description: 'Join us for an exclusive track day at the Nürburgring GP circuit. All BMW models welcome, M cars get priority pit lane access.',
  dateStart: new Date('2024-04-15'),
  dateEnd: new Date('2024-04-15'),
  locationRegion: 'Nürburgring',
  locationName: 'Nürburgring GP',
  brandFilter: 'BMW',
  status: 'UPCOMING' as const,
}

const mockAttendees = [
  { id: '1', car: { make: 'BMW', model: 'M4', generation: 'G82' }, image: null },
  { id: '2', car: { make: 'BMW', model: 'M3', generation: 'G80' }, image: null },
  { id: '3', car: { make: 'BMW', model: 'M5', generation: 'F90' }, image: null },
  { id: '4', car: { make: 'BMW', model: 'M2', generation: 'G87' }, image: null },
  { id: '5', car: { make: 'BMW', model: 'i4', generation: 'G26' }, image: null },
  { id: '6', car: { make: 'BMW', model: 'M8', generation: 'F92' }, image: null },
]

const mockUserCars = [
  { id: '1', make: 'BMW', model: 'M4', generation: 'G82' },
  { id: '2', make: 'Audi', model: 'RS6', generation: 'C8' },
]

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [selectedCar, setSelectedCar] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE')

  async function handleRSVP() {
    if (!selectedCar) return

    setStatus('LOADING')

    try {
      await fetch(`/api/events/${params.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: selectedCar, status: 'GOING' }),
      })
      setStatus('SUCCESS')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Event Header */}
      <div className="bg-zinc-800 rounded-xl p-8 border border-zinc-700">
        <div className="flex items-center gap-2 mb-4">
          {mockEvent.brandFilter && (
            <span className="px-3 py-1 bg-zinc-700 text-zinc-300 text-sm rounded">
              {mockEvent.brandFilter}
            </span>
          )}
          <span className="text-zinc-400">
            {mockEvent.dateStart.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">{mockEvent.title}</h1>
        <p className="text-zinc-300 mb-4">{mockEvent.description}</p>
        <p className="text-zinc-400">
          📍 {mockEvent.locationName}, {mockEvent.locationRegion}
        </p>
      </div>

      {/* RSVP Section */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <h2 className="text-xl font-bold text-white mb-4">RSVP</h2>

        {status === 'SUCCESS' ? (
          <div className="text-green-400 text-center py-4">
            You're going! See you at the event.
          </div>
        ) : (
          <div className="flex gap-4">
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="">Select your car</option>
              {mockUserCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.make} {car.model} {car.generation}
                </option>
              ))}
            </select>
            <button
              onClick={handleRSVP}
              disabled={!selectedCar || status === 'LOADING'}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              {status === 'LOADING' ? '...' : "I'm going"}
            </button>
          </div>
        )}
      </div>

      {/* The Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">The Grid ({mockAttendees.length} cars)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {mockAttendees.map((attendee) => (
            <div
              key={attendee.id}
              className="aspect-square bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center relative group"
            >
              <span className="text-zinc-500 text-sm">Car</span>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white text-center truncate">
                  {attendee.car.make} {attendee.car.model}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back Link */}
      <Link href="/events" className="text-zinc-400 hover:text-white transition-colors">
        ← All Events
      </Link>
    </div>
  )
}
