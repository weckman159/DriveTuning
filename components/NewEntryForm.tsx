'use client'

import { useState } from 'react'
import { TuvBadge } from './TuvBadge'

type LogEntryType = 'MODIFICATION' | 'MAINTENANCE' | 'TRACK_DAY' | 'DYNO'
type ModificationCategory = 'SUSPENSION' | 'ENGINE' | 'EXHAUST' | 'BRAKES' | 'WHEELS' | 'AERO' | 'INTERIOR' | 'OTHER'
type TuvStatus = 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'
type ElementVisibility = 'NONE' | 'SELF' | 'LINK' | 'PUBLIC'
type DocumentType = 'ABE' | 'EINTRAGUNG' | 'RECEIPT' | 'SERVICE' | 'OTHER'

interface Props {
  carId: string
  onSubmitSuccess?: () => void
}

export default function NewEntryForm({ carId, onSubmitSuccess }: Props) {
  const [type, setType] = useState<LogEntryType>('MODIFICATION')
  const [visibility, setVisibility] = useState<ElementVisibility>('SELF')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [partName, setPartName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ModificationCategory>('SUSPENSION')
  const [price, setPrice] = useState('')
  const [tuvStatus, setTuvStatus] = useState<TuvStatus>('YELLOW_ABE')
  const [evidenceType, setEvidenceType] = useState<DocumentType>('RECEIPT')
  const [evidenceVisibility, setEvidenceVisibility] = useState<ElementVisibility>('SELF')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceIssuer, setEvidenceIssuer] = useState('')
  const [evidenceNumber, setEvidenceNumber] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function resetForm() {
    setTitle('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setPartName('')
    setBrand('')
    setPrice('')
    setTuvStatus('YELLOW_ABE')
    setEvidenceTitle('')
    setEvidenceIssuer('')
    setEvidenceNumber('')
    setEvidenceUrl('')
    setEvidenceFile(null)
  }

  async function readFileAsDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
      reader.readAsDataURL(file)
    })
  }

  async function maybeAttachEvidence(input: {
    modificationId?: string | null
  }) {
    const url = evidenceUrl.trim()
    if (!url && !evidenceFile) return

    let fileDataUrl: string | null = null
    if (evidenceFile) {
      const maxBytes = 10 * 1024 * 1024
      if (evidenceFile.size > maxBytes) throw new Error('Dokument zu gross (max. 10MB)')
      fileDataUrl = await readFileAsDataUrl(evidenceFile)
    }

    const res = await fetch(`/api/cars/${carId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: evidenceType,
        visibility: evidenceVisibility,
        title: evidenceTitle.trim() || null,
        issuer: evidenceIssuer.trim() || null,
        documentNumber: evidenceNumber.trim() || null,
        url: url || null,
        fileDataUrl,
        modificationId: input.modificationId || null,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Nachweis konnte nicht angehaengt werden')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setWarning(null)
    setSuccess(false)

    const payload = {
      carId,
      type,
      visibility,
      title,
      description,
      date,
      totalCostImpact: price ? parseFloat(price) : null,
      ...(type === 'MODIFICATION' && {
        modification: {
          partName,
          brand,
          category,
          price: price ? parseFloat(price) : null,
          tuvStatus,
        },
      }),
    }

    try {
      const res = await fetch(`/api/cars/${carId}/log-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Eintrag konnte nicht erstellt werden')
      }

      const created = await res.json().catch(() => ({} as any))
      const modificationId =
        created && Array.isArray(created.modifications) && typeof created.modifications[0]?.id === 'string'
          ? created.modifications[0].id
          : null

      try {
        await maybeAttachEvidence({ modificationId })
      } catch (err) {
        setWarning(err instanceof Error ? err.message : 'Nachweis konnte nicht angehaengt werden')
      }

      setSuccess(true)
      resetForm()

      if (onSubmitSuccess) {
        onSubmitSuccess()
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
      {/* Entry Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Eintragstyp</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LogEntryType)}
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
        >
          <option value="MODIFICATION">Modifikation</option>
          <option value="MAINTENANCE">Wartung</option>
          <option value="TRACK_DAY">Trackday</option>
          <option value="DYNO">Dyno</option>
        </select>
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Sichtbarkeit</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ElementVisibility)}
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
        >
          <option value="SELF">Nur ich</option>
          <option value="LINK">Link</option>
          <option value="PUBLIC">Oeffentlich</option>
          <option value="NONE">Keine</option>
        </select>
        <p className="text-xs text-zinc-500">
          Standard ist &quot;Nur ich&quot; (Datenschutz standardmaessig). Waehle Link/Oeffentlich, um diesen Eintrag im Build Passport zu teilen.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. KW V3 Gewindefahrwerk eingebaut"
          required
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Beschreibung (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Modification Fields */}
      {type === 'MODIFICATION' && (
        <div className="space-y-4 pt-4 border-t border-zinc-700">
          <h3 className="text-lg font-medium text-white">Modifikationsdetails</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Teilename</label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="z.B. Gewindefahrwerk"
                required
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Marke</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="z.B. KW"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ModificationCategory)}
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="SUSPENSION">Fahrwerk</option>
                <option value="ENGINE">Motor</option>
                <option value="EXHAUST">Auspuff</option>
                <option value="BRAKES">Bremsen</option>
                <option value="WHEELS">Raeder</option>
                <option value="AERO">Aero</option>
                <option value="INTERIOR">Innenraum</option>
                <option value="OTHER">Sonstiges</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Price (€)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* TUV Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">TÜV Status</label>
            <div className="flex gap-3">
              {(['GREEN_REGISTERED', 'YELLOW_ABE', 'RED_RACING'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTuvStatus(status)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tuvStatus === status
                      ? 'bg-sky-500 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  <div className="flex justify-center">
                    <TuvBadge status={status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evidence */}
      <div className="space-y-3 pt-4 border-t border-zinc-700">
        <h3 className="text-lg font-medium text-white">Nachweis (optional)</h3>
        <p className="text-xs text-zinc-500">
          Haenge jetzt einen Beleg, ABE, eine Eintragung oder eine Service-Rechnung an, damit der Eintrag nachvollziehbar bleibt.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Typ</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as DocumentType)}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
            >
              <option value="RECEIPT">Beleg</option>
              <option value="SERVICE">Service</option>
              <option value="ABE">ABE</option>
              <option value="EINTRAGUNG">Eintragung</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Sichtbarkeit</label>
            <select
              value={evidenceVisibility}
              onChange={(e) => setEvidenceVisibility(e.target.value as ElementVisibility)}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
            >
              <option value="SELF">Nur ich</option>
              <option value="LINK">Link</option>
              <option value="PUBLIC">Oeffentlich</option>
              <option value="NONE">Keine</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Titel (optional)</label>
            <input
              type="text"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="z.B. ABE-741163 / Rechnung #123"
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Aussteller (optional)</label>
            <input
              type="text"
              value={evidenceIssuer}
              onChange={(e) => setEvidenceIssuer(e.target.value)}
              placeholder="z.B. KBA / TUEV / Werkstatt"
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Nummer (optional)</label>
            <input
              type="text"
              value={evidenceNumber}
              onChange={(e) => setEvidenceNumber(e.target.value)}
              placeholder="z.B. ABE-123456"
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300">URL (optional)</label>
            <input
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... oder /pfad"
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300">Upload (PDF oder Bild)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
            />
            <p className="text-xs text-zinc-500">Max 10MB. Wenn eine Datei ausgewaehlt ist, wird sie hochgeladen und als Dokument-URL verwendet.</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="space-y-2">
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
        {warning && !error && (
          <p className="text-amber-300 text-sm text-center">{warning}</p>
        )}
        {success && (
          <p className="text-green-400 text-sm text-center">Eintrag erfolgreich erstellt</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Speichere...
            </>
          ) : (
            'Eintrag speichern'
          )}
        </button>
      </div>
    </form>
  )
}

