'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import MarketSoonBanner from '@/components/MarketSoonBanner'
import ImageLightbox from '@/components/ImageLightbox'
import { convertImageFileToWebpDataUrl, estimateDataUrlBytes } from '@/lib/client-image'

type Listing = {
  id: string
  title: string
  description: string | null
  price: number
  condition: 'NEW' | 'LIKE_NEW' | 'USED'
  mileageOnCar: number | null
  status: 'ACTIVE' | 'RESERVED' | 'SOLD'
  seller: { id: string }
  images?: string[]
}

export default function EditListingPage() {
  const { data: session } = useSession()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    condition: 'USED',
    mileageOnCar: '',
    status: 'ACTIVE',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [processingImages, setProcessingImages] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const MAX_IMAGES = 4
  const MAX_INPUT_IMAGE_BYTES = 12 * 1024 * 1024
  const MAX_OUTPUT_WEBP_BYTES = 700 * 1024
  const MAX_DIMENSION = 1600

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const files = Array.from(input.files || [])
    if (!files.length) return

    if (images.length + files.length > MAX_IMAGES) {
      setError(`Du kannst bis zu ${MAX_IMAGES} Fotos hochladen.`)
      input.value = ''
      return
    }

    try {
      setProcessingImages(true)
      const converted: string[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Nur Bilddateien sind erlaubt.')
        }
        if (file.size > MAX_INPUT_IMAGE_BYTES) {
          throw new Error('Jedes Foto muss 12MB oder kleiner sein.')
        }
        try {
          const webpDataUrl = await convertImageFileToWebpDataUrl(file, {
            maxBytes: MAX_OUTPUT_WEBP_BYTES,
            maxDimension: MAX_DIMENSION,
          })
          converted.push(webpDataUrl)
        } catch {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('Bilddatei konnte nicht gelesen werden.'))
            reader.readAsDataURL(file)
          })
          if (estimateDataUrlBytes(dataUrl) > MAX_OUTPUT_WEBP_BYTES) {
            throw new Error('Bild konnte nicht optimiert werden. Bitte ein kleineres Foto oder einen anderen Browser verwenden.')
          }
          converted.push(dataUrl)
        }
      }
      setImages((prev) => [...prev, ...converted])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bild konnte nicht verarbeitet werden.')
    } finally {
      setProcessingImages(false)
      input.value = ''
    }
  }

  useEffect(() => {
    async function loadListing() {
      try {
        setLoading(true)
        const res = await fetch(`/api/market/listings/${params.id}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Angebot nicht gefunden')
        }
        const data = await res.json()
        const item = data.listing as Listing
        setListing(item)
        setImages(item.images || [])
        setFormData({
          title: item.title,
          description: item.description || '',
          price: String(item.price),
          condition: item.condition,
          mileageOnCar: item.mileageOnCar ? String(item.mileageOnCar) : '',
          status: item.status,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
      } finally {
        setLoading(false)
      }
    }
    loadListing()
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!listing) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/market/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          mileageOnCar: formData.mileageOnCar ? Number(formData.mileageOnCar) : null,
          images,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Angebot konnte nicht aktualisiert werden.')
      }
      router.push(`/market/${listing.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center text-zinc-400">Lade Angebot...</div>
  }

  if (error || !listing) {
    return <div className="text-center text-zinc-400">{error || 'Angebot nicht gefunden'}</div>
  }

  if (session?.user?.id !== listing.seller.id) {
    return <div className="text-center text-zinc-400">Du kannst nur deine eigenen Angebote bearbeiten.</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <MarketSoonBanner />
      <ImageLightbox
        open={lightboxOpen}
        images={images}
        initialIndex={lightboxIndex}
        alt="Angebotsfoto"
        onClose={() => setLightboxOpen(false)}
      />
      <nav className="text-sm text-zinc-400">
        <Link href={`/market/${listing.id}`} className="hover:text-white transition-colors">
          Angebot
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Bearbeiten</span>
      </nav>

      <h1 className="text-3xl font-bold text-white">Angebot bearbeiten</h1>

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
            <label className="block text-sm font-medium text-zinc-300">Preis (EUR)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="0"
              step="0.01"
              required
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Zustand</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="USED">Gebraucht</option>
              <option value="LIKE_NEW">Wie neu</option>
              <option value="NEW">Neu</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Laufleistung am Fahrzeug (km)</label>
            <input
              type="number"
              value={formData.mileageOnCar}
              onChange={(e) => setFormData({ ...formData, mileageOnCar: e.target.value })}
              min="0"
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            >
              <option value="ACTIVE">Aktiv</option>
              <option value="RESERVED">Reserviert</option>
              <option value="SOLD">Verkauft</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Fotos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={processingImages}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white file:mr-4 file:rounded file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-white hover:file:bg-sky-400"
          />
          <p className="text-xs text-zinc-500">
            Bis zu {MAX_IMAGES} Fotos. Bilder werden automatisch (WebP) optimiert (Ziel: {Math.round(MAX_OUTPUT_WEBP_BYTES / 1024)}KB).
          </p>
          {processingImages && <p className="text-xs text-sky-300">Optimiere Bilder...</p>}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative">
                  <button
                    type="button"
                    title="Bilder ansehen"
                    onClick={() => {
                      setLightboxIndex(index)
                      setLightboxOpen(true)
                    }}
                    className="group block w-full rounded-lg border border-zinc-700 overflow-hidden cursor-zoom-in transition-all hover:border-sky-400 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_22px_rgba(56,189,248,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    <Image
                      src={img}
                      alt={`Angebotsfoto ${index + 1}`}
                      width={480}
                      height={96}
                      className="w-full h-24 object-cover"
                      unoptimized={typeof img === 'string' && img.startsWith('data:')}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            href={`/market/${listing.id}`}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving || processingImages}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
