'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SuggestInput from '@/components/SuggestInput'

type CarMeta = {
  yearsLabel: string | null
  years: number[]
  inferredGeneration: string | null
  inferredBodyCode: string | null
  bodyCodes?: string[]
}

function transmissionLabel(value: string) {
  if (value === 'MT') return 'MT (Manuell)'
  if (value === 'AT') return 'AT (Automatik)'
  if (value === 'DCT') return 'DCT'
  if (value === 'CVT') return 'CVT'
  if (value === 'AMT') return 'AMT'
  if (value === 'OTHER') return 'Sonstiges'
  return '—'
}

export default function AddCarPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const garageId = params.id

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    generation: '',
    bodyCode: '',
    hsn: '',
    tsn: '',
    year: '',
    transmission: '',
    transmissionOther: '',
    projectGoal: 'TRACK',
    currentMileage: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [meta, setMeta] = useState<CarMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [generationTouched, setGenerationTouched] = useState(false)
  const [bodyTouched, setBodyTouched] = useState(false)
  const [yearTouched, setYearTouched] = useState(false)
  const [yearMode, setYearMode] = useState<'AUTO' | 'MANUAL'>('AUTO')

  const yearOptions = useMemo(() => (meta?.years || []).slice().sort((a, b) => b - a), [meta?.years])
  const showYearSelect = yearMode === 'AUTO' && yearOptions.length > 0

  useEffect(() => {
    const make = formData.make.trim()
    const model = formData.model.trim()

    if (!make || !model) {
      setMeta(null)
      setMetaError(null)
      setMetaLoading(false)
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      setMetaLoading(true)
      setMetaError(null)
      try {
        const sp = new URLSearchParams()
        sp.set('make', make)
        sp.set('model', model)
        const res = await fetch(`/api/dictionary/car-meta?${sp.toString()}`)
        const data = await res.json().catch(() => ({} as any))
        if (cancelled) return
        if (!res.ok) {
          setMeta(null)
          setMetaError(typeof data.error === 'string' ? data.error : 'Meta konnte nicht geladen werden')
          return
        }
        const next = data.meta as CarMeta | undefined
        setMeta(next || null)

        if (next?.inferredGeneration && !generationTouched && !formData.generation.trim()) {
          setFormData((prev) => ({ ...prev, generation: next.inferredGeneration || '' }))
        }
        if (next?.inferredBodyCode && !bodyTouched && !formData.bodyCode.trim()) {
          setFormData((prev) => ({ ...prev, bodyCode: next.inferredBodyCode || '' }))
        }

        if (next?.years && next.years.length === 1 && yearMode === 'AUTO' && !yearTouched && !formData.year.trim()) {
          setFormData((prev) => ({ ...prev, year: String(next.years[0]) }))
        }
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [bodyTouched, formData.bodyCode, formData.generation, formData.make, formData.model, formData.year, generationTouched, yearMode, yearTouched])

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
      const transmissionFinal =
        formData.transmission === 'OTHER'
          ? formData.transmissionOther.trim()
          : formData.transmission.trim()

      const res = await fetch(`/api/garages/${garageId}/cars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          transmission: transmissionFinal || null,
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

      <h1 className="text-3xl font-semibold text-white">Fahrzeug hinzufuegen</h1>

      <form onSubmit={handleSubmit} className="space-y-6 p-6 panel">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SuggestInput
              label="Marke"
              value={formData.make}
              onChange={(value) => {
                setMeta(null)
                setMetaError(null)
                setYearMode('AUTO')
                setGenerationTouched(false)
                setBodyTouched(false)
                setYearTouched(false)
                setFormData({
                  ...formData,
                  make: value,
                  model: '',
                  generation: '',
                  bodyCode: '',
                  hsn: '',
                  tsn: '',
                  year: '',
                })
              }}
              required
              dictType="car_make"
              placeholder="z.B. Volkswagen"
            />
          </div>
          <div>
            <SuggestInput
              label="Modell"
              value={formData.model}
              onChange={(value) => {
                setMeta(null)
                setMetaError(null)
                setYearMode('AUTO')
                setGenerationTouched(false)
                setBodyTouched(false)
                setYearTouched(false)
                setFormData({
                  ...formData,
                  model: value,
                  generation: '',
                  bodyCode: '',
                  hsn: '',
                  tsn: '',
                  year: '',
                })
              }}
              required
              dictType="car_model"
              dictMake={formData.make}
              placeholder="z.B. Golf IV"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Generation</label>
            <input
              type="text"
              value={formData.generation}
              onChange={(e) => {
                setGenerationTouched(true)
                setFormData({ ...formData, generation: e.target.value })
              }}
              className="input-base"
            />
            {meta?.inferredGeneration ? (
              <p className="mt-1 text-xs text-zinc-500">Vorschlag: {meta.inferredGeneration}</p>
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Baujahr</label>
              {yearOptions.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-sky-400 hover:text-sky-300"
                  onClick={() => setYearMode((m) => (m === 'AUTO' ? 'MANUAL' : 'AUTO'))}
                  title="Zwischen Auswahl und manuellem Modus wechseln"
                >
                  {yearMode === 'AUTO' ? 'Manuell' : 'Auswaehlen'}
                </button>
              ) : null}
            </div>

            {showYearSelect ? (
              <select
                value={formData.year}
                onChange={(e) => {
                  setYearTouched(true)
                  setFormData({ ...formData, year: e.target.value })
                }}
                className="select-base"
              >
                <option value="">Baujahr waehlen...</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={formData.year}
                onChange={(e) => {
                  setYearTouched(true)
                  setFormData({ ...formData, year: e.target.value })
                }}
                className="input-base"
                placeholder={yearOptions.length > 0 ? 'z.B. 2012' : undefined}
              />
            )}

            {meta?.yearsLabel ? (
              <p className="mt-1 text-xs text-zinc-500">Katalog: {meta.yearsLabel}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Kuzov (z.B. E90/W204)</label>
            {meta?.bodyCodes && meta.bodyCodes.length > 0 ? (
              <select
                value={formData.bodyCode}
                onChange={(e) => {
                  const next = e.target.value
                  setBodyTouched(true)
                  setFormData({ ...formData, bodyCode: next })
                }}
                className="select-base mb-2"
                title="Kuzov aus Katalog waehlen"
              >
                <option value="">Katalog waehlen...</option>
                {meta.bodyCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              value={formData.bodyCode}
              onChange={(e) => {
                setBodyTouched(true)
                setFormData({ ...formData, bodyCode: e.target.value })
              }}
              className="input-base"
              placeholder="optional"
            />
            {meta?.inferredBodyCode ? (
              <p className="mt-1 text-xs text-zinc-500">Vorschlag: {meta.inferredBodyCode}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">HSN (optional)</label>
            <input
              type="text"
              value={formData.hsn}
              onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
              className="input-base"
              placeholder="z.B. 0005"
            />
            <p className="mt-1 text-xs text-zinc-500">Herstellerschluesselnummer (DE).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">TSN (optional)</label>
            <input
              type="text"
              value={formData.tsn}
              onChange={(e) => setFormData({ ...formData, tsn: e.target.value })}
              className="input-base"
              placeholder="z.B. ABC"
            />
            <p className="mt-1 text-xs text-zinc-500">Typschluesselnummer (DE).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Getriebe</label>
            <select
              value={formData.transmission}
              onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
              className="select-base"
            >
              <option value="">—</option>
              <option value="MT">{transmissionLabel('MT')}</option>
              <option value="AT">{transmissionLabel('AT')}</option>
              <option value="DCT">{transmissionLabel('DCT')}</option>
              <option value="CVT">{transmissionLabel('CVT')}</option>
              <option value="AMT">{transmissionLabel('AMT')}</option>
              <option value="OTHER">{transmissionLabel('OTHER')}</option>
            </select>
            {formData.transmission === 'OTHER' ? (
              <input
                type="text"
                value={formData.transmissionOther}
                onChange={(e) => setFormData({ ...formData, transmissionOther: e.target.value })}
                className="input-base mt-2"
                placeholder="z.B. 8HP / Tiptronic"
              />
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Projektziel</label>
            <select
              value={formData.projectGoal}
              onChange={(e) => setFormData({ ...formData, projectGoal: e.target.value })}
              className="select-base"
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
              className="input-base"
            />
          </div>
        </div>

        {metaLoading ? <p className="text-xs text-zinc-500">Katalogdaten werden geladen...</p> : null}
        {metaError ? <p className="text-xs text-amber-400">{metaError}</p> : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300 mb-1">Titelbild</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="input-base file:mr-4 file:rounded file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-white hover:file:bg-sky-400"
          />
          <p className="text-xs text-zinc-500">JPG/PNG/WebP, bis 700KB</p>
          {photoPreview && (
            <Image
              src={photoPreview}
              alt="Vorschau des ausgewaehlten Fotos"
              width={768}
              height={416}
              className="w-full max-w-md h-52 object-cover rounded-xl border border-white/10"
              unoptimized={typeof photoPreview === 'string' && photoPreview.startsWith('data:')}
            />
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            href="/garage"
            className="px-4 py-2 btn-secondary"
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
