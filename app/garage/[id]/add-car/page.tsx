'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function AddCarPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const garageId = params.id

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    generation: '',
    year: '',
    projectGoal: 'TRACK',
    currentMileage: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoPreview(null)
      setPhotoBase64(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Bitte eine Bilddatei hochladen.')
      e.target.value = ''
      return
    }

    // Keep payload below app route body limits.
    if (file.size > 700 * 1024) {
      setError('Foto ist zu gross. Maximale Groesse: 700KB.')
      e.target.value = ''
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'))
      reader.readAsDataURL(file)
    })

    setError(null)
    setPhotoPreview(dataUrl)
    setPhotoBase64(dataUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/garages/${garageId}/cars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          heroImage: photoBase64,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Fahrzeug konnte nicht hinzugefuegt werden.')
      }

      router.push('/garage')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="text-sm text-zinc-400">
        <Link href="/garage" className="hover:text-white transition-colors">
          Garage
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Fahrzeug hinzufuegen</span>
      </nav>

      <h1 className="text-3xl font-bold text-white">Fahrzeug hinzufuegen</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Marke</label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Modell</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Generation</label>
            <input
              type="text"
              value={formData.generation}
              onChange={(e) => setFormData({ ...formData, generation: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Baujahr</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Projektziel</label>
            <select
              value={formData.projectGoal}
              onChange={(e) => setFormData({ ...formData, projectGoal: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="DAILY">Alltag</option>
              <option value="TRACK">Track</option>
              <option value="SHOW">Show</option>
              <option value="RESTORATION">Restauration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Aktueller Kilometerstand (km)</label>
            <input
              type="number"
              value={formData.currentMileage}
              onChange={(e) => setFormData({ ...formData, currentMileage: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300 mb-1">Titelbild</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white file:mr-4 file:rounded file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-white hover:file:bg-sky-400"
          />
          <p className="text-xs text-zinc-500">JPG/PNG/WebP, bis 700KB</p>
          {photoPreview && (
            <Image
              src={photoPreview}
              alt="Vorschau des ausgewaehlten Fotos"
              width={768}
              height={416}
              className="w-full max-w-md h-52 object-cover rounded-lg border border-zinc-700"
              unoptimized={typeof photoPreview === 'string' && photoPreview.startsWith('data:')}
            />
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            href="/garage"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Speichere...' : 'Fahrzeug hinzufuegen'}
          </button>
        </div>
      </form>
    </div>
  )
}
