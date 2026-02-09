'use client'

import { useMemo, useState } from 'react'

const APPROVAL_OPTIONS = [
  { id: 'ABE', label: 'ABE' },
  { id: 'ABG', label: 'ABG' },
  { id: 'EBE', label: 'EBE' },
  { id: 'ECE', label: 'ECE' },
  { id: 'TEILEGUTACHTEN', label: 'Teilegutachten' },
  { id: 'EINTRAGUNG', label: 'Eintragung (Fahrzeugschein)' },
  { id: 'EINZELABNAHME', label: 'Einzelabnahme (21)' },
  { id: 'EINTRAGUNGSPFLICHTIG', label: 'Eintragungspflichtig (ohne Dokument)' },
] as const

const ORG_OPTIONS = [
  { id: 'tuev_sued', label: 'TUEV Sued' },
  { id: 'tuev_nord', label: 'TUEV Nord' },
  { id: 'tuev_rheinland', label: 'TUEV Rheinland' },
  { id: 'dekra', label: 'DEKRA' },
  { id: 'gtue', label: 'GTUE' },
  { id: 'other', label: 'Andere' },
] as const

export default function LegalityContributionForm(props: { modificationId: string }) {
  const [approvalType, setApprovalType] = useState<string>('TEILEGUTACHTEN')
  const [approvalNumber, setApprovalNumber] = useState<string>('')
  const [inspectionOrg, setInspectionOrg] = useState<string>('tuev_sued')
  const [inspectionDate, setInspectionDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState<string>('')
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true)
  const [hasDocuments, setHasDocuments] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const canSubmit = useMemo(() => {
    if (!approvalType) return false
    if (!inspectionOrg) return false
    if (!inspectionDate) return false
    return true
  }, [approvalType, inspectionOrg, inspectionDate])

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/legality/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modificationId: props.modificationId,
          approvalType,
          approvalNumber: approvalNumber.trim() ? approvalNumber.trim() : null,
          inspectionOrg,
          inspectionDate,
          notes: notes.trim() ? notes.trim() : null,
          isAnonymous,
          hasDocuments,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(String(data?.error || 'Beitrag konnte nicht gespeichert werden'))
        return
      }

      setSuccess(true)
      setNotes('')
      setApprovalNumber('')
      setHasDocuments(false)
      setIsAnonymous(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <div className="text-lg font-semibold text-white">TUEV bestanden? Erfahrung teilen</div>
        <div className="text-xs text-zinc-400">
          Dein Beitrag wird moderiert und hilft anderen. Keine Rechtsberatung. Bitte keine personenbezogenen Daten in Notizen.
        </div>
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Danke. Dein Beitrag wurde eingereicht (Status: PENDING).
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Genehmigungstyp</label>
          <select value={approvalType} onChange={(e) => setApprovalType(e.target.value)} className="select-base">
            {APPROVAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Prueforganisation</label>
          <select value={inspectionOrg} onChange={(e) => setInspectionOrg(e.target.value)} className="select-base">
            {ORG_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Pruefdatum</label>
          <input
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            className="input-base"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Nummer (optional)</label>
          <input
            type="text"
            value={approvalNumber}
            onChange={(e) => setApprovalNumber(e.target.value)}
            placeholder="z.B. KBA 43234 / TG ..."
            className="input-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Notizen (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Einschraenkungen, Kombinationen, Hinweise vom Pruefer..."
          className="w-full min-h-[120px] px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
        />
        <div className="text-xs text-zinc-500">
          Keine Namen, Kennzeichen, Adressen. Nur technische Details.
        </div>
      </div>

      <div className="space-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={hasDocuments} onChange={(e) => setHasDocuments(e.target.checked)} />
          Ich habe Dokumente/Fotos als Nachweis (optional, spaeter)
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Anonym anzeigen (empfohlen)
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
        >
          {submitting ? 'Sende...' : 'Beitrag senden'}
        </button>
      </div>
    </div>
  )
}

