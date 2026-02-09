'use client'

import { useEffect, useMemo, useState } from 'react'
import { TuvBadge } from './TuvBadge'
import SuggestInput from './SuggestInput'

type LogEntryType = 'MODIFICATION' | 'MAINTENANCE' | 'TRACK_DAY' | 'DYNO'
type ModificationCategory = 'SUSPENSION' | 'ENGINE' | 'EXHAUST' | 'BRAKES' | 'WHEELS' | 'AERO' | 'INTERIOR' | 'OTHER'
type TuvStatus = 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'
type ElementVisibility = 'NONE' | 'SELF' | 'LINK' | 'PUBLIC'
type DocumentType = 'ABE' | 'ABG' | 'EBE' | 'TEILEGUTACHTEN' | 'EINZELABNAHME' | 'EINTRAGUNG' | 'RECEIPT' | 'SERVICE' | 'OTHER'

type LegalityCheckResponse = {
  approvalType: string
  legalityStatus?: string
  violations?: Array<{
    ruleId: string
    severity: 'info' | 'warning' | 'critical'
    messageDe: string
    messageEn: string
  }>
  userParameters?: Record<string, number> | null
  bestMatch: null | {
    label: string
    item: {
      brand: string
      model: string
      approvalType: string
      approvalNumber?: string | null
      sourceUrl?: string | null
      restrictions?: string[]
      notesDe?: string | null
    }
  }
  nextSteps?: string[]
  warnings?: string[]
  dbMatches?: Array<{
    id: string
    brand: string
    partName: string
    approvalType: string
    approvalNumber?: string | null
    sourceUrl?: string | null
    isSynthetic?: boolean
  }>
  communityProofs?: Array<{
    id: string
    approvalType: string
    approvalNumber?: string | null
    inspectionOrg: string
    inspectionDate: string
    notes?: string | null
    hasDocuments?: boolean
      createdAt: string
  }>
}

const STVZO_ACK_KEY = 'dt_stvzo_ack_v1'

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
  const [success, setSuccess] = useState(false)
  const [stvzoAck, setStvzoAck] = useState(false)
  const [carMeta, setCarMeta] = useState<{ make: string; model: string; year: number | null; stateId?: string | null } | null>(null)
  const [legality, setLegality] = useState<LegalityCheckResponse | null>(null)
  const [legalityLoading, setLegalityLoading] = useState(false)
  const [legalityEt, setLegalityEt] = useState('')
  const [legalityTrackWidthChange, setLegalityTrackWidthChange] = useState('')
  const [legalityClearanceLoaded, setLegalityClearanceLoaded] = useState('')
  const [legalityNoiseLevelDb, setLegalityNoiseLevelDb] = useState('')

  const requiresStvzoAck = type === 'MODIFICATION'

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STVZO_ACK_KEY)
      if (raw === '1') setStvzoAck(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!requiresStvzoAck) return
    if (carMeta) return

    let cancelled = false
    fetch(`/api/cars/${carId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (!data?.car) return
        setCarMeta({
          make: String(data.car.make || ''),
          model: String(data.car.model || ''),
          year: typeof data.car.year === 'number' ? data.car.year : null,
          stateId: typeof data.car.stateId === 'string' ? data.car.stateId : null,
        })
      })
      .catch(() => null)

    return () => {
      cancelled = true
    }
  }, [requiresStvzoAck, carId, carMeta])

  const legalityQuery = useMemo(() => {
    if (!requiresStvzoAck) return null
    const b = brand.trim()
    const p = partName.trim()
    if (!b || !p) return null
    return {
      brand: b,
      partName: p,
      category,
      make: carMeta?.make || '',
      model: carMeta?.model || '',
      year: carMeta?.year ?? null,
      stateId: carMeta?.stateId ?? null,
      et: legalityEt.trim() || null,
      trackWidthChange: legalityTrackWidthChange.trim() || null,
      clearanceLoaded: legalityClearanceLoaded.trim() || null,
      noiseLevelDb: legalityNoiseLevelDb.trim() || null,
    }
  }, [
    requiresStvzoAck,
    brand,
    partName,
    category,
    carMeta,
    legalityEt,
    legalityTrackWidthChange,
    legalityClearanceLoaded,
    legalityNoiseLevelDb,
  ])

  useEffect(() => {
    if (!legalityQuery) {
      setLegality(null)
      return
    }

    const controller = new AbortController()
    const t = setTimeout(() => {
      setLegalityLoading(true)
      const params = new URLSearchParams()
      params.set('brand', legalityQuery.brand)
      params.set('partName', legalityQuery.partName)
      params.set('category', legalityQuery.category)
      if (legalityQuery.make) params.set('make', legalityQuery.make)
      if (legalityQuery.model) params.set('model', legalityQuery.model)
      if (legalityQuery.year !== null) params.set('year', String(legalityQuery.year))
      if (legalityQuery.stateId) params.set('stateId', String(legalityQuery.stateId))
      if (legalityQuery.et) params.set('et', legalityQuery.et)
      if (legalityQuery.trackWidthChange) params.set('trackWidthChange', legalityQuery.trackWidthChange)
      if (legalityQuery.clearanceLoaded) params.set('clearanceLoaded', legalityQuery.clearanceLoaded)
      if (legalityQuery.noiseLevelDb) params.set('noiseLevelDb', legalityQuery.noiseLevelDb)
      fetch(`/api/legality/check?${params.toString()}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          setLegality(data as LegalityCheckResponse)
        })
        .catch(() => null)
        .finally(() => setLegalityLoading(false))
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [legalityQuery])

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
    setLegalityEt('')
    setLegalityTrackWidthChange('')
    setLegalityClearanceLoaded('')
    setLegalityNoiseLevelDb('')
  }

  async function readFileAsDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (requiresStvzoAck && !stvzoAck) {
      setError('Bitte bestaetige zuerst den Haftungshinweis zur StVZO.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)

    const url = evidenceUrl.trim()
    let fileDataUrl: string | null = null
    if (evidenceFile) {
      const maxBytes = 10 * 1024 * 1024
      if (evidenceFile.size > maxBytes) {
        setLoading(false)
        setError('Dokument zu gross (max. 10MB)')
        return
      }
      fileDataUrl = await readFileAsDataUrl(evidenceFile)
    }

    const hasEvidence = Boolean(url || fileDataUrl)

    const userParameters: Record<string, number> = {}
    const et = legalityEt.trim() ? Number(legalityEt.trim()) : null
    const trackWidthChange = legalityTrackWidthChange.trim() ? Number(legalityTrackWidthChange.trim()) : null
    const clearanceLoaded = legalityClearanceLoaded.trim() ? Number(legalityClearanceLoaded.trim()) : null
    const noiseLevelDb = legalityNoiseLevelDb.trim() ? Number(legalityNoiseLevelDb.trim()) : null
    if (Number.isFinite(et as any)) userParameters.et = et as any
    if (Number.isFinite(trackWidthChange as any)) userParameters.trackWidthChange = trackWidthChange as any
    if (Number.isFinite(clearanceLoaded as any)) userParameters.clearanceLoaded = clearanceLoaded as any
    if (Number.isFinite(noiseLevelDb as any)) userParameters.noiseLevelDb = noiseLevelDb as any

    const payload = {
      carId,
      type,
      visibility,
      title,
      description,
      date,
      totalCostImpact: price ? parseFloat(price) : null,
      documents: hasEvidence
        ? [
            {
              type: evidenceType,
              visibility: evidenceVisibility,
              title: evidenceTitle.trim() || null,
              issuer: evidenceIssuer.trim() || null,
              documentNumber: evidenceNumber.trim() || null,
              url: url || null,
              fileDataUrl,
              attachTo: type === 'MODIFICATION' ? 'MODIFICATION' : 'CAR',
              approvalType:
                evidenceType === 'ABE' ||
                evidenceType === 'ABG' ||
                evidenceType === 'EBE' ||
                evidenceType === 'TEILEGUTACHTEN' ||
                evidenceType === 'EINZELABNAHME' ||
                evidenceType === 'EINTRAGUNG'
                  ? evidenceType
                  : null,
              approvalNumber: evidenceNumber.trim() || null,
              issuingAuthority: evidenceIssuer.trim() || null,
            },
          ]
        : undefined,
      ...(type === 'MODIFICATION' && {
        modification: {
          partName,
          brand,
          category,
          price: price ? parseFloat(price) : null,
          tuvStatus,
          userParameters: Object.keys(userParameters).length ? userParameters : null,
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

      await res.json().catch(() => ({} as any))

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
    <form onSubmit={handleSubmit} className="space-y-6 p-6 panel">
      {/* Entry Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Eintragstyp</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LogEntryType)}
          className="select-base"
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
          className="select-base"
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
          className="input-base"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Beschreibung (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="textarea-base resize-none"
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
          className="input-base"
        />
      </div>

      {/* Modification Fields */}
      {type === 'MODIFICATION' && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-lg font-medium text-white">Modifikationsdetails</h3>

          {!stvzoAck && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
              <div className="font-semibold text-amber-100">Hinweis zur StVZO</div>
              <p className="mt-2 text-amber-100/90">
                DriveTuning stellt technische Informationen bereit und ersetzt nicht die Pruefung durch eine Prueforganisation (TUEV/DEKRA/GTUE).
                Die rechtliche Verantwortung fuer die Einhaltung der StVZO liegt beim Fahrzeughalter.
              </p>
              <label className="mt-3 flex items-start gap-3 text-amber-100/95">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-amber-300"
                  checked={stvzoAck}
                  onChange={(e) => {
                    const ok = Boolean(e.target.checked)
                    setStvzoAck(ok)
                    try {
                      window.localStorage.setItem(STVZO_ACK_KEY, ok ? '1' : '0')
                    } catch {
                      // ignore
                    }
                  }}
                />
                <span>Ich bestaetige, dass ich die rechtliche Verantwortung fuer die Einhaltung der StVZO trage.</span>
              </label>
              <div className="mt-3">
                <a className="text-amber-200 underline hover:text-amber-100" href="/legal/haftungsausschluss">
                  Haftungsausschluss lesen
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Teilename</label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="z.B. Gewindefahrwerk"
                required
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Marke</label>
              <SuggestInput
                value={brand}
                onChange={(value) => setBrand(value)}
                placeholder="z.B. KW"
                dictType="brand"
                inputClassName="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ModificationCategory)}
                className="select-base"
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
              <label className="block text-sm font-medium text-zinc-300">Preis (EUR)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="input-base"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Legality Check (DE, Beta)</div>
                <div className="text-xs text-zinc-400">Referenz + Checkliste, keine Rechtsberatung</div>
              </div>
              {legalityLoading ? <div className="text-xs text-zinc-400">Pruefe...</div> : null}
            </div>

            {legality?.bestMatch ? (
              <div className="mt-3 space-y-2 text-sm text-zinc-200">
                <div className="font-medium">
                  Treffer: {legality.bestMatch.item.brand} {legality.bestMatch.item.model}
                  {legality.bestMatch.item.approvalNumber ? ` · ${legality.bestMatch.item.approvalNumber}` : ''}
                </div>
                <div className="text-xs text-zinc-400">Typ: {String(legality.approvalType || 'NONE')}</div>
                {Array.isArray(legality.warnings) && legality.warnings.length ? (
                  <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90">
                    {legality.warnings.slice(0, 4).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                {Array.isArray(legality.nextSteps) && legality.nextSteps.length ? (
                  <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-300">
                    {legality.nextSteps.slice(0, 5).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
                {legality.bestMatch.item.sourceUrl ? (
                  <a className="text-xs text-sky-400 hover:text-sky-300" href={legality.bestMatch.item.sourceUrl} target="_blank" rel="noreferrer">
                    Quelle oeffnen
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 text-xs text-zinc-400">
                Kein Treffer im Referenz-Index. Tipp: lade ABE/ABG/Teilegutachten als Nachweis hoch, dann ist der Build Passport spaeter nachvollziehbar.
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs text-zinc-500">ET (optional)</label>
                <input
                  type="number"
                  value={legalityEt}
                  onChange={(e) => setLegalityEt(e.target.value)}
                  placeholder="z.B. 35"
                  className="input-base"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-500">Spurveraenderung mm (optional)</label>
                <input
                  type="number"
                  value={legalityTrackWidthChange}
                  onChange={(e) => setLegalityTrackWidthChange(e.target.value)}
                  placeholder="z.B. 15"
                  className="input-base"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-500">Bodenfreiheit beladen mm (optional)</label>
                <input
                  type="number"
                  value={legalityClearanceLoaded}
                  onChange={(e) => setLegalityClearanceLoaded(e.target.value)}
                  placeholder="z.B. 105"
                  className="input-base"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-500">Geraeusch dB (optional)</label>
                <input
                  type="number"
                  value={legalityNoiseLevelDb}
                  onChange={(e) => setLegalityNoiseLevelDb(e.target.value)}
                  placeholder="z.B. 93"
                  className="input-base"
                />
              </div>
            </div>

            {Array.isArray(legality?.violations) && legality!.violations!.length ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-xs text-zinc-200">
                <div className="font-semibold text-white">Warnings</div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {legality!.violations!.slice(0, 5).map((v) => (
                    <li
                      key={`${v.ruleId}-${v.messageDe}`}
                      className={
                        v.severity === 'critical'
                          ? 'text-red-200'
                          : v.severity === 'warning'
                            ? 'text-amber-200'
                            : 'text-zinc-200'
                      }
                    >
                      [{v.severity}] {v.messageDe}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(legality?.dbMatches) && legality!.dbMatches!.length ? (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100/90">
                <div className="font-semibold text-amber-100">DB Seed Matches</div>
                <div className="mt-1 text-amber-100/80">
                  Diese Eintraege koennen UNVERIFIED sein (Demo/Seed). Nutze sie nur mit primaerer Quelle (PDF/Gutachten).
                </div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {legality!.dbMatches!.slice(0, 3).map((m) => (
                    <li key={m.id}>
                      {m.brand} {m.partName}
                      {m.approvalNumber ? ` · ${m.approvalNumber}` : ''}
                      {m.isSynthetic ? ' (UNVERIFIED)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(legality?.communityProofs) && legality!.communityProofs!.length ? (
              <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100/90">
                <div className="font-semibold text-emerald-100">Community Proofs (moderiert)</div>
                <div className="mt-1 text-emerald-100/80">
                  Diese Beitraege sind Erfahrungswerte. Primaere Quellen (ABE/ABG/Gutachten) bleiben entscheidend.
                </div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {legality!.communityProofs!.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      {String(c.approvalType || '').toUpperCase()}
                      {c.approvalNumber ? ` · ${c.approvalNumber}` : ''}
                      {' · '}
                      {String(c.inspectionOrg || '').toUpperCase()}
                      {' · '}
                      {new Date(c.inspectionDate).toLocaleDateString('de-DE')}
                      {c.hasDocuments ? ' · docs' : ''}
                      {c.notes ? ` · ${String(c.notes).slice(0, 80)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* TUV Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">TUEV Status</label>
            <div className="flex gap-3">
              {(['GREEN_REGISTERED', 'YELLOW_ABE', 'RED_RACING'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTuvStatus(status)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tuvStatus === status
                      ? 'bg-sky-500 text-white'
                      : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
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
      <div className="space-y-3 pt-4 border-t border-white/10">
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
              className="select-base"
            >
              <option value="RECEIPT">Beleg</option>
              <option value="SERVICE">Service</option>
              <option value="ABE">ABE</option>
              <option value="ABG">ABG</option>
              <option value="EBE">EBE</option>
              <option value="TEILEGUTACHTEN">Teilegutachten</option>
              <option value="EINZELABNAHME">Einzelabnahme</option>
              <option value="EINTRAGUNG">Eintragung</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Sichtbarkeit</label>
            <select
              value={evidenceVisibility}
              onChange={(e) => setEvidenceVisibility(e.target.value as ElementVisibility)}
              className="select-base"
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
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Aussteller (optional)</label>
            <input
              type="text"
              value={evidenceIssuer}
              onChange={(e) => setEvidenceIssuer(e.target.value)}
              placeholder="z.B. KBA / TUEV / Werkstatt"
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Nummer (optional)</label>
            <input
              type="text"
              value={evidenceNumber}
              onChange={(e) => setEvidenceNumber(e.target.value)}
              placeholder="z.B. ABE-123456"
              className="input-base"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300">URL (optional)</label>
            <input
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... oder /pfad"
              className="input-base"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300">Upload (PDF oder Bild)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              className="input-base"
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
        {success && (
          <p className="text-green-400 text-sm text-center">Eintrag erfolgreich erstellt</p>
        )}
        <button
          type="submit"
          disabled={loading || (requiresStvzoAck && !stvzoAck)}
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

