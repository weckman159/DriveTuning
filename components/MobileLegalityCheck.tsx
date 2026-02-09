'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { LegalityBadge } from '@/components/LegalityBadge'

type Violation = {
  ruleId: string
  severity: 'info' | 'warning' | 'critical'
  messageDe: string
  messageEn: string
  legalReferences?: Array<{
    lawId: string
    lawNameDe: string
    lawNameEn: string
    lawUrl: string
    section: string
    notesDe?: string
    notesEn?: string
  }>
}

type LegalityCheckResponse = {
  approvalType: string
  legalityStatus: string
  warnings?: string[]
  nextSteps?: string[]
  violations?: Violation[]
  bestMatch?: null | {
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
  dbMatches?: Array<{
    id: string
    brand: string
    partName: string
    category: string | null
    approvalType: string
    approvalNumber?: string | null
    sourceId?: string | null
    sourceUrl?: string | null
    isSynthetic?: boolean
    updatedAt?: string
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
  disclaimer?: { title: string; body: string }
}

const CACHE_KEY = 'dt_mobile_legality_check_v1'

type CachedEntry = {
  cachedAt: string
  requestUrl: string
  response: LegalityCheckResponse
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeApprovalFromScan(raw: string) {
  const s = String(raw || '').trim()
  if (!s) return null
  const m = s.match(/KBA\s*\d{3,8}/i)
  if (m) return m[0].replace(/\s+/g, ' ').toUpperCase()
  const digitsOnly = s.replace(/[^0-9]/g, '')
  if (/^\d{3,8}$/.test(digitsOnly)) return `KBA ${digitsOnly}`
  return s
}

function SeverityPill(props: { severity: Violation['severity'] }) {
  const cfg =
    props.severity === 'critical'
      ? { label: 'kritisch', className: 'bg-red-500/15 text-red-200 border-red-500/30' }
      : props.severity === 'warning'
        ? { label: 'warnung', className: 'bg-amber-500/15 text-amber-200 border-amber-500/30' }
        : { label: 'info', className: 'bg-sky-500/10 text-sky-200 border-sky-500/25' }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cfg.className}`}>{cfg.label}</span>
}

function CameraScan(props: { onDetected: (value: string) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof (window as any).BarcodeDetector !== 'undefined'
    setSupported(ok)
  }, [])

  async function stop() {
    runningRef.current = false
    setRunning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop()
    }
    streamRef.current = null
  }

  useEffect(() => {
    return () => {
      stop().catch(() => null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    setError(null)
    if (!videoRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const detector = new (window as any).BarcodeDetector({
        formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'pdf417'],
      })

      runningRef.current = true
      setRunning(true)
      const tick = async () => {
        if (!videoRef.current || !runningRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (Array.isArray(barcodes) && barcodes.length > 0) {
            const raw = String(barcodes[0]?.rawValue || '').trim()
            if (raw) {
              props.onDetected(raw)
              await stop()
              return
            }
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Scan error')
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kamera konnte nicht gestartet werden')
    }
  }

  if (supported === false) {
    return (
      <div className="text-xs text-zinc-400">
        Kamera-Scan wird von diesem Browser nicht unterstuetzt. Tipp: Chrome/Edge auf Android.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/40">
        <video ref={videoRef} className="w-full h-56 object-cover" playsInline muted />
      </div>
      {error ? <div className="text-xs text-red-300">{error}</div> : null}
      <div className="flex gap-2">
        {!running ? (
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => start()}>
            Scan starten (beta)
          </button>
        ) : (
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => stop()}>
            Stop
          </button>
        )}
      </div>
      <div className="text-[11px] text-zinc-500">
        Hinweis: Erkennung basiert auf Browser-API und kann unzuverlaessig sein. Im Zweifel Nummer manuell eingeben.
      </div>
    </div>
  )
}

export default function MobileLegalityCheck() {
  const [category, setCategory] = useState('WHEELS')
  const [brand, setBrand] = useState('')
  const [partName, setPartName] = useState('')
  const [approvalNumber, setApprovalNumber] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [stateId, setStateId] = useState('')

  const [et, setEt] = useState('')
  const [trackWidthChange, setTrackWidthChange] = useState('')
  const [clearanceLoaded, setClearanceLoaded] = useState('')
  const [noiseLevelDb, setNoiseLevelDb] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LegalityCheckResponse | null>(null)
  const [cached, setCached] = useState<CachedEntry | null>(null)

  useEffect(() => {
    const c = safeParseJson<CachedEntry>(window.localStorage.getItem(CACHE_KEY))
    if (c && c.response) setCached(c)
  }, [])

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('brand', brand.trim())
    params.set('partName', partName.trim())
    params.set('category', category)
    if (approvalNumber.trim()) params.set('approvalNumber', approvalNumber.trim())
    if (make.trim()) params.set('make', make.trim())
    if (model.trim()) params.set('model', model.trim())
    if (year.trim()) params.set('year', year.trim())
    if (stateId.trim()) params.set('stateId', stateId.trim())
    if (et.trim()) params.set('et', et.trim())
    if (trackWidthChange.trim()) params.set('trackWidthChange', trackWidthChange.trim())
    if (clearanceLoaded.trim()) params.set('clearanceLoaded', clearanceLoaded.trim())
    if (noiseLevelDb.trim()) params.set('noiseLevelDb', noiseLevelDb.trim())
    return `/api/legality/check?${params.toString()}`
  }, [
    approvalNumber,
    brand,
    category,
    clearanceLoaded,
    et,
    make,
    model,
    noiseLevelDb,
    partName,
    stateId,
    trackWidthChange,
    year,
  ])

  async function runCheck() {
    const b = brand.trim()
    const p = partName.trim()
    if (!b || !p) {
      setError('Bitte Marke und Teilname ausfuellen.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(requestUrl)
      const json = (await res.json().catch(() => null)) as LegalityCheckResponse | null
      if (!res.ok || !json) {
        setError('Legality-Check fehlgeschlagen.')
        return
      }
      setData(json)
      const entry: CachedEntry = { cachedAt: new Date().toISOString(), requestUrl, response: json }
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
      setCached(entry)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Legality Schnellcheck</h1>
          <p className="text-zinc-400 mt-1">
            Teileingabe, ABE-Nummer, Parameter, Region. Ergebnis ist ein Hinweis, keine Rechtsberatung.
          </p>
        </div>
        <Link href="/settings/legality-guide" className="btn-secondary px-3 py-2 text-sm whitespace-nowrap">
          TUEV Guide
        </Link>
      </div>

      <div className="panel p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Kategorie</label>
            <select className="select-base" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="WHEELS">Wheels</option>
              <option value="SUSPENSION">Suspension</option>
              <option value="EXHAUST">Exhaust</option>
              <option value="BRAKES">Brakes</option>
              <option value="AERO">Aero</option>
              <option value="LIGHTING">Lighting</option>
              <option value="ECU">ECU</option>
              <option value="INTERIOR">Interior</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-zinc-300 mb-1">Marke</label>
            <input className="input-base" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="z.B. BBS, KW" />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-zinc-300 mb-1">Teil</label>
            <input className="input-base" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="z.B. CH-R 8.5Jx19 ET35" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-1">Genehmigungsnummer (optional)</label>
            <input className="input-base" value={approvalNumber} onChange={(e) => setApprovalNumber(e.target.value)} placeholder="z.B. KBA 43234" />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button
              type="button"
              className="btn-primary w-full px-4 py-2.5 text-sm"
              onClick={() => runCheck()}
              disabled={loading}
            >
              {loading ? 'Pruefe...' : 'Pruefen'}
            </button>
          </div>
        </div>

        <details className="panel-soft p-4">
          <summary className="cursor-pointer text-sm text-zinc-200">Fahrzeug und Parameter (optional)</summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Make</label>
                <input className="input-base" value={make} onChange={(e) => setMake(e.target.value)} placeholder="BMW" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1">Model</label>
                <input className="input-base" value={model} onChange={(e) => setModel(e.target.value)} placeholder="F30 3er" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Year</label>
                <input className="input-base" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2015" inputMode="numeric" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Bundesland</label>
                <input className="input-base" value={stateId} onChange={(e) => setStateId(e.target.value.toUpperCase())} placeholder="BY, BW, ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">ET</label>
                <input className="input-base" value={et} onChange={(e) => setEt(e.target.value)} placeholder="35" inputMode="decimal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Spurveraenderung (mm)</label>
                <input className="input-base" value={trackWidthChange} onChange={(e) => setTrackWidthChange(e.target.value)} placeholder="15" inputMode="decimal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Bodenfreiheit beladen (mm)</label>
                <input className="input-base" value={clearanceLoaded} onChange={(e) => setClearanceLoaded(e.target.value)} placeholder="110" inputMode="decimal" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Geraeusch (dB) @ 4000 U/min</label>
                <input className="input-base" value={noiseLevelDb} onChange={(e) => setNoiseLevelDb(e.target.value)} placeholder="92" inputMode="decimal" />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn-secondary w-full px-4 py-2.5 text-sm"
                  onClick={() => {
                    setMake('')
                    setModel('')
                    setYear('')
                    setStateId('')
                    setEt('')
                    setTrackWidthChange('')
                    setClearanceLoaded('')
                    setNoiseLevelDb('')
                  }}
                >
                  Parameter leeren
                </button>
              </div>
            </div>
          </div>
        </details>

        <details className="panel-soft p-4">
          <summary className="cursor-pointer text-sm text-zinc-200">Kamera-Scan (beta)</summary>
          <div className="mt-4">
            <CameraScan
              onDetected={(raw) => {
                const normalized = normalizeApprovalFromScan(raw)
                if (normalized) setApprovalNumber(normalized)
              }}
            />
          </div>
        </details>

        {error ? <div className="text-sm text-red-300">{error}</div> : null}

        {cached && !data ? (
          <div className="text-xs text-zinc-400">
            Letztes Ergebnis im Cache: {new Date(cached.cachedAt).toLocaleString('de-DE')}{' '}
            <button
              type="button"
              className="underline hover:text-white ml-2"
              onClick={() => setData(cached.response)}
            >
              anzeigen
            </button>
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-sm text-zinc-400">Status</div>
              <LegalityBadge status={data.legalityStatus} approvalType={data.approvalType} />
            </div>
            <div className="text-xs text-zinc-500">
              Cache: {cached ? new Date(cached.cachedAt).toLocaleString('de-DE') : '—'}
            </div>
          </div>

          {Array.isArray(data.warnings) && data.warnings.length ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Warnungen</div>
              <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                {data.warnings.map((w, i) => (
                  <li key={i} className="text-zinc-200">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {Array.isArray(data.violations) && data.violations.length ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Checks</div>
              <div className="mt-3 space-y-3">
                {data.violations.map((v, i) => (
                  <div key={`${v.ruleId}-${i}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-zinc-100">{v.messageDe}</div>
                      <SeverityPill severity={v.severity} />
                    </div>
                    {Array.isArray(v.legalReferences) && v.legalReferences.length ? (
                      <div className="mt-2 text-xs text-zinc-400 space-y-1">
                        {v.legalReferences.map((r) => (
                          <div key={`${v.ruleId}-${r.lawId}-${r.section}`} className="flex flex-wrap items-center gap-2">
                            <a
                              href={r.lawUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-300 hover:text-sky-200 underline"
                            >
                              {r.lawNameDe}
                            </a>
                            <span className="text-zinc-500">{r.section}</span>
                            {r.notesDe ? <span className="text-zinc-400">{r.notesDe}</span> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.bestMatch ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Referenz (Dictionary)</div>
              <div className="mt-2 text-sm text-zinc-200">
                {data.bestMatch.item.brand} {data.bestMatch.item.model}{' '}
                {data.bestMatch.item.approvalNumber ? (
                  <span className="text-zinc-400">· {data.bestMatch.item.approvalNumber}</span>
                ) : null}
              </div>
              {data.bestMatch.item.sourceUrl ? (
                <a href={data.bestMatch.item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-300 underline">
                  Quelle oeffnen
                </a>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(data.dbMatches) && data.dbMatches.length ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Treffer (DB)</div>
              <div className="mt-2 space-y-2">
                {data.dbMatches.map((m) => (
                  <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-zinc-100">
                      {m.brand} {m.partName}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400 flex flex-wrap gap-2">
                      <span>{m.approvalType}</span>
                      {m.approvalNumber ? <span className="font-mono">{m.approvalNumber}</span> : null}
                      {m.sourceId ? <span>src:{m.sourceId}</span> : null}
                      {typeof m.isSynthetic === 'boolean' ? <span>{m.isSynthetic ? 'synthetic' : 'primary'}</span> : null}
                    </div>
                    {m.sourceUrl ? (
                      <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-300 underline">
                        Quelle oeffnen
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {Array.isArray(data.communityProofs) && data.communityProofs.length ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Community Proofs</div>
              <div className="mt-2 space-y-2">
                {data.communityProofs.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-zinc-100">
                      {c.approvalType} {c.approvalNumber ? `· ${c.approvalNumber}` : ''}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {c.inspectionOrg} · {new Date(c.inspectionDate).toLocaleDateString('de-DE')}
                      {c.hasDocuments ? ' · docs' : ''}
                    </div>
                    {c.notes ? <div className="mt-2 text-sm text-zinc-200">{c.notes}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {Array.isArray(data.nextSteps) && data.nextSteps.length ? (
            <div className="panel-soft p-4">
              <div className="text-sm font-medium text-white">Next steps</div>
              <ol className="mt-2 space-y-1 text-sm text-zinc-200 list-decimal list-inside">
                {data.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {data.disclaimer ? (
            <div className="text-xs text-zinc-500">
              <span className="text-zinc-300 font-medium">{data.disclaimer.title}:</span> {data.disclaimer.body}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
