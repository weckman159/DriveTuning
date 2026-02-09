'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import MarketSoonBanner from '@/components/MarketSoonBanner'
import ImageLightbox from '@/components/ImageLightbox'
import { convertImageFileToWebpDataUrl, estimateDataUrlBytes } from '@/lib/client-image'

interface ModificationData {
  partName: string
  brand: string | null
  category: string
  car: {
    make: string
    model: string
    generation: string | null
  } | null
  mileageOnCar: number | null
  tuvStatus: string
}

function NewListingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modificationId = searchParams.get('modificationId')

  const [loading, setLoading] = useState(!!modificationId)
  const [modification, setModification] = useState<ModificationData | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'USED' | 'LIKE_NEW' | 'NEW'>('USED')
  const [mileageOnCar, setMileageOnCar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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
          // Fallback: keep original if WebP encoding isn't supported in the browser.
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

  // Fetch modification data if provided
  useEffect(() => {
    async function loadModification() {
      if (!modificationId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/modifications/${modificationId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Modifikation konnte nicht geladen werden.')
        }
        const data = await res.json()
        setModification(data.modification || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
      } finally {
        setLoading(false)
      }
    }
    loadModification()
  }, [modificationId])

  // Auto-populate fields when modification data is loaded
  useEffect(() => {
    if (modification) {
      setTitle(`${modification.brand || ''} ${modification.partName}`.trim())
      setMileageOnCar(modification.mileageOnCar?.toString() || '')
      setDescription(
        `Verwendet auf ${modification.car?.make} ${modification.car?.model} ${modification.car?.generation || ''} fuer ${modification.mileageOnCar?.toLocaleString() || 0} km. ${modification.tuvStatus === 'YELLOW_ABE' ? 'ABE vorhanden.' : ''}`.trim()
      )
    }
  }, [modification])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/market/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price),
          condition,
          mileageOnCar: mileageOnCar ? parseInt(mileageOnCar) : null,
          modificationId,
          images,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Angebot konnte nicht erstellt werden.')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/market')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && modificationId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <MarketSoonBanner />
      <ImageLightbox
        open={lightboxOpen}
        images={images}
        initialIndex={lightboxIndex}
        alt="Angebotsfoto"
        onClose={() => setLightboxOpen(false)}
      />
      <h1 className="text-3xl font-semibold text-white mb-8">Angebot erstellen</h1>

      <form onSubmit={handleSubmit} className="space-y-6 p-6 panel">
        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. KW V3 Gewindefahrwerk"
            required
            className="input-base"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="textarea-base resize-none"
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Preis (EUR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            className="input-base"
          />
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Zustand</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as typeof condition)}
            className="select-base"
          >
            <option value="USED">Gebraucht</option>
            <option value="LIKE_NEW">Wie neu</option>
            <option value="NEW">Neu</option>
          </select>
        </div>

        {/* Mileage on Car */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Laufleistung am Fahrzeug (km)</label>
          <input
            type="number"
            value={mileageOnCar}
            onChange={(e) => setMileageOnCar(e.target.value)}
            placeholder="0"
            min="0"
            className="input-base"
          />
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Fotos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={processingImages}
            className="input-base file:mr-4 file:rounded file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-white hover:file:bg-sky-400"
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
                    className="group block w-full rounded-xl border border-white/10 overflow-hidden cursor-zoom-in transition-all hover:border-sky-400 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_22px_rgba(56,189,248,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
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

        {/* Submit */}
        <div className="space-y-2">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Angebot erstellt. Weiterleitung...</p>}
          <button
            type="submit"
            disabled={loading || processingImages}
            className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Erstelle...' : 'Angebot erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewListingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    }>
      <NewListingContent />
    </Suspense>
  )
}

