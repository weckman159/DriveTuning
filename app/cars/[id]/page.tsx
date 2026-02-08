'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { TuvBadge } from '@/components/TuvBadge'
import NewEntryForm from '@/components/NewEntryForm'
import { convertImageFileToWebpDataUrl, estimateDataUrlBytes } from '@/lib/client-image'
import ImageLightbox from '@/components/ImageLightbox'

type LogEntry = {
  id: string
  date: string
  title: string
  type: 'MODIFICATION' | 'MAINTENANCE' | 'TRACK_DAY' | 'DYNO'
  totalCostImpact: number | string | null
  modifications: { id: string; tuvStatus: 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING' }[]
}

type Car = {
  id: string
  slug?: string | null
  make: string
  model: string
  generation: string | null
  year: number | null
  projectGoal: 'DAILY' | 'TRACK' | 'SHOW' | 'RESTORATION'
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  buildStatus: 'IN_PROGRESS' | 'TUV_READY' | 'TRACK_READY' | 'DAILY_READY'
  currentMileage: number | null
  heroImage: string | null
  forSale: boolean
  askingPrice: string | number | null
  engineCode: string | null
  factoryHp: number | null
  factoryWeight: number | null
  drive: string | null
  transmission: string | null
  logEntries: LogEntry[]
}

type ShareLink = {
  id: string
  token: string
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  visibility: string
  _count?: { views: number }
  lastViewedAt?: string | null
  uniqueViewers?: number
}

type BuildTask = {
  id: string
  title: string
  description: string | null
  category: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

type Document = {
  id: string
  type: string
  visibility: 'NONE' | 'SELF' | 'LINK' | 'PUBLIC'
  status: string
  title: string | null
  issuer: string | null
  documentNumber: string | null
  url: string
  uploadedAt: string
}

const typeColors = {
  MODIFICATION: 'bg-sky-500',
  MAINTENANCE: 'bg-zinc-500',
  TRACK_DAY: 'bg-purple-500',
  DYNO: 'bg-orange-500',
} as const

const projectGoalLabels: Record<Car['projectGoal'], string> = {
  DAILY: 'Alltag',
  TRACK: 'Track',
  SHOW: 'Show',
  RESTORATION: 'Restauration',
}

const buildStatusLabels: Record<Car['buildStatus'], string> = {
  IN_PROGRESS: 'In Arbeit',
  TUV_READY: 'TUEV bereit',
  TRACK_READY: 'Track bereit',
  DAILY_READY: 'Alltag bereit',
}

function QuickActionTile(props: { href: string; label: string; icon: ReactNode; iconToneClass: string }) {
  return (
    <Link
      href={props.href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 px-5 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${props.iconToneClass}`}>
        {props.icon}
      </div>
      <div className="mt-4 text-center text-[11px] font-semibold tracking-[0.22em] text-zinc-200">
        {props.label}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [background:radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.06),transparent_60%)]" />
    </Link>
  )
}

export default function CarPage() {
  const routeParams = useParams<{ id?: string | string[] }>()
  const carId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id

  const [showNewEntry, setShowNewEntry] = useState(false)
  const [car, setCar] = useState<Car | null>(null)
  const [forSale, setForSale] = useState(false)
  const [askingPrice, setAskingPrice] = useState('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareExpiresInDays, setShareExpiresInDays] = useState<0 | 7 | 30>(30)
  const [visibility, setVisibility] = useState<Car['visibility']>('UNLISTED')
  const [buildStatus, setBuildStatus] = useState<Car['buildStatus']>('IN_PROGRESS')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [docType, setDocType] = useState('ABE')
  const [docVisibility, setDocVisibility] = useState<Document['visibility']>('SELF')
  const [docTitle, setDocTitle] = useState('')
  const [docIssuer, setDocIssuer] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingSale, setSavingSale] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroError, setHeroError] = useState<string | null>(null)
  const [heroPreviewOpen, setHeroPreviewOpen] = useState(false)

  const HERO_MAX_INPUT_BYTES = 12 * 1024 * 1024
  const HERO_MAX_OUTPUT_BYTES = 900 * 1024
  const HERO_MAX_DIMENSION = 2000

  const loadCar = useCallback(async () => {
    if (!carId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/cars/${carId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Auto nicht gefunden')
      }
      const data = await res.json()
      setCar(data.car)
      setForSale(!!data.car.forSale)
      setAskingPrice(data.car.askingPrice ? String(data.car.askingPrice) : '')
      if (data.car.visibility === 'PUBLIC' || data.car.visibility === 'UNLISTED' || data.car.visibility === 'PRIVATE') {
        setVisibility(data.car.visibility)
      }
      if (
        data.car.buildStatus === 'IN_PROGRESS' ||
        data.car.buildStatus === 'TUV_READY' ||
        data.car.buildStatus === 'TRACK_READY' ||
        data.car.buildStatus === 'DAILY_READY'
      ) {
        setBuildStatus(data.car.buildStatus)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setLoading(false)
    }
  }, [carId])

  const loadShareLinks = useCallback(async () => {
    if (!carId) return
    try {
      const res = await fetch(`/api/cars/${carId}/share-links`)
      if (!res.ok) return
      const data = await res.json()
      setShareLinks(Array.isArray(data.links) ? data.links : [])
      if (typeof data.slug === 'string' && data.slug.trim()) {
        // Keep car.slug in sync so "Copy" can build full URLs.
        setCar((c) => (c ? { ...c, slug: data.slug } : c))
      }
    } catch {
      // Ignore share link load errors; not critical for viewing the car page.
    }
  }, [carId])

  const loadTasks = useCallback(async () => {
    if (!carId) return
    setTasksLoading(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/tasks`)
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setTasks(Array.isArray(data.tasks) ? data.tasks : [])
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Aufgaben konnten nicht geladen werden')
    } finally {
      setTasksLoading(false)
    }
  }, [carId])

  const loadDocuments = useCallback(async () => {
    if (!carId) return
    setDocsLoading(true)
    setDocsError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/documents`)
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setDocuments(Array.isArray(data.documents) ? data.documents : [])
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Dokumente konnten nicht geladen werden')
    } finally {
      setDocsLoading(false)
    }
  }, [carId])

  useEffect(() => {
    if (!carId) return
    loadCar()
    loadShareLinks()
    loadTasks()
    loadDocuments()
  }, [carId, loadCar, loadShareLinks, loadTasks, loadDocuments])

  async function uploadHeroImage(file: File) {
    setHeroUploading(true)
    setHeroError(null)
    try {
      if (!carId) throw new Error('Auto-ID fehlt')
      if (!file.type.startsWith('image/')) throw new Error('Nur Bilddateien sind erlaubt')
      if (file.size > HERO_MAX_INPUT_BYTES) throw new Error('Hero-Bild muss 12MB oder kleiner sein')

      let imageDataUrl: string
      try {
        imageDataUrl = await convertImageFileToWebpDataUrl(file, {
          maxBytes: HERO_MAX_OUTPUT_BYTES,
          maxDimension: HERO_MAX_DIMENSION,
        })
      } catch {
        const fallback = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Bilddatei konnte nicht gelesen werden'))
          reader.readAsDataURL(file)
        })
        if (!fallback.startsWith('data:image/')) throw new Error('Nicht unterstuetzte Bilddatei')
        if (estimateDataUrlBytes(fallback) > HERO_MAX_OUTPUT_BYTES) {
          throw new Error('Hero-Bild konnte nicht optimiert werden. Bitte kleinere Datei oder anderen Browser versuchen.')
        }
        imageDataUrl = fallback
      }

      const res = await fetch(`/api/cars/${carId}/hero-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Hero-Bild konnte nicht hochgeladen werden')
      }

      await loadCar()
    } catch (err) {
      setHeroError(err instanceof Error ? err.message : 'Hero-Bild konnte nicht hochgeladen werden')
    } finally {
      setHeroUploading(false)
    }
  }

  async function removeHeroImage() {
    setHeroUploading(true)
    setHeroError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/hero-image`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Hero-Bild konnte nicht entfernt werden')
      }
      await loadCar()
    } catch (err) {
      setHeroError(err instanceof Error ? err.message : 'Hero-Bild konnte nicht entfernt werden')
    } finally {
      setHeroUploading(false)
    }
  }

  async function createDocument() {
    const url = docUrl.trim()
    if (!url && !docFile) return
    setDocsLoading(true)
    setDocsError(null)
    try {
      let fileDataUrl: string | null = null
      if (docFile) {
        const maxBytes = 10 * 1024 * 1024
        if (docFile.size > maxBytes) throw new Error('Dokument zu gross (max. 10MB)')
        fileDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
          reader.readAsDataURL(docFile)
        })
      }

      const res = await fetch(`/api/cars/${carId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: docType,
          visibility: docVisibility,
          title: docTitle.trim() || null,
          issuer: docIssuer.trim() || null,
          documentNumber: docNumber.trim() || null,
          url: url || null,
          fileDataUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Dokument konnte nicht hinzugefuegt werden')
      }
      setDocTitle('')
      setDocIssuer('')
      setDocNumber('')
      setDocUrl('')
      setDocFile(null)
      await loadDocuments()
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Dokument konnte nicht hinzugefuegt werden')
    } finally {
      setDocsLoading(false)
    }
  }

  async function setDocumentVisibility(documentId: string, visibility: Document['visibility']) {
    setDocsLoading(true)
    setDocsError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Dokument konnte nicht aktualisiert werden')
      }
      await loadDocuments()
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Dokument konnte nicht aktualisiert werden')
    } finally {
      setDocsLoading(false)
    }
  }

  async function deleteDocument(documentId: string) {
    setDocsLoading(true)
    setDocsError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/documents/${documentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Dokument konnte nicht geloescht werden')
      }
      await loadDocuments()
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Dokument konnte nicht geloescht werden')
    } finally {
      setDocsLoading(false)
    }
  }

  async function createTask() {
    const title = taskTitle.trim()
    if (!title) return
    setTasksLoading(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Aufgabe konnte nicht erstellt werden')
      }
      setTaskTitle('')
      setTaskDueAt('')
      await loadTasks()
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Aufgabe konnte nicht erstellt werden')
    } finally {
      setTasksLoading(false)
    }
  }

  async function setTaskStatus(taskId: string, status: BuildTask['status']) {
    setTasksLoading(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Aufgabe konnte nicht aktualisiert werden')
      }
      await loadTasks()
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Aufgabe konnte nicht aktualisiert werden')
    } finally {
      setTasksLoading(false)
    }
  }

  async function deleteTask(taskId: string) {
    setTasksLoading(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Aufgabe konnte nicht geloescht werden')
      }
      await loadTasks()
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Aufgabe konnte nicht geloescht werden')
    } finally {
      setTasksLoading(false)
    }
  }

  async function createShareLink() {
    setShareLoading(true)
    setShareError(null)
    try {
      if (visibility === 'PRIVATE') {
        throw new Error('Private Builds koennen nicht geteilt werden. Stelle die Sichtbarkeit zuerst auf UNLISTED oder PUBLIC.')
      }
      const res = await fetch(`/api/cars/${carId}/share-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInDays: shareExpiresInDays === 0 ? null : shareExpiresInDays,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Share-Link konnte nicht erstellt werden')
      }
      const data = await res.json()
      const slug = data.slug as string | undefined
      const token = data.shareLink?.token as string | undefined
      if (!slug || !token) throw new Error('Ungueltige Serverantwort')
      const url = `${window.location.origin}/build/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`
      setShareUrl(url)
      await navigator.clipboard?.writeText(url).catch(() => {})
      await loadShareLinks()
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setShareLoading(false)
    }
  }

  async function saveVisibilityAndStatus() {
    setSavingMeta(true)
    setMetaError(null)
    try {
      const res = await fetch(`/api/cars/${carId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility, buildStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Build-Einstellungen konnten nicht gespeichert werden')
      }
      await loadCar()
      await loadShareLinks()
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setSavingMeta(false)
    }
  }

  async function copyShareLink(token: string) {
    const slug = car?.slug
    const url =
      slug
        ? `${window.location.origin}/build/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`
        : null

    await navigator.clipboard?.writeText(url || token).catch(() => {})
  }

  async function revokeShareLink(shareLinkId: string) {
    setShareLoading(true)
    setShareError(null)
    try {
      const res = await fetch(`/api/cars/${carId}/share-links/${shareLinkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REVOKE' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Share-Link konnte nicht widerrufen werden')
      }
      await loadShareLinks()
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setShareLoading(false)
    }
  }

  async function saveSaleStatus() {
    setSavingSale(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/cars/${carId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forSale,
          askingPrice: askingPrice ? Number(askingPrice) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Verkaufsstatus konnte nicht aktualisiert werden')
      }
      await loadCar()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setSavingSale(false)
    }
  }

  if (loading) {
    return <div className="text-center text-zinc-400">Auto wird geladen...</div>
  }

  if (error || !car) {
    return <div className="text-center text-zinc-400">{error || 'Auto nicht gefunden'}</div>
  }

  const totalMods = car.logEntries.filter((e) => e.type === 'MODIFICATION').length
  const totalTrackDays = car.logEntries.filter((e) => e.type === 'TRACK_DAY').length
  const totalSpent = car.logEntries.reduce((acc, e) => acc + (Number(e.totalCostImpact) || 0), 0)

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(70%_55%_at_15%_10%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_40%_at_90%_15%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(60%_50%_at_50%_100%,rgba(59,130,246,0.10),transparent_55%)]" />
      <div className="max-w-6xl mx-auto space-y-8">
        <ImageLightbox
          open={heroPreviewOpen}
          images={car.heroImage ? [car.heroImage] : []}
          initialIndex={0}
          alt={`${car.make} ${car.model}`}
          onClose={() => setHeroPreviewOpen(false)}
        />

        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              {car.make} {car.model} {car.generation || ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              <span>{car.year ? `${car.year}` : '—'}</span>
              <span className="text-zinc-700">•</span>
              <span>{car.currentMileage != null ? `${car.currentMileage.toLocaleString()} km` : '— km'}</span>
              <span className="text-zinc-700">•</span>
              <span>{totalMods} Modifikationen</span>
              <span className="text-zinc-700">•</span>
              <span>{totalTrackDays} Trackdays</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
                {projectGoalLabels[car.projectGoal]}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
                {buildStatusLabels[buildStatus]}
              </span>
              {forSale ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Zu verkaufen
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowNewEntry((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/15">+</span>
              {showNewEntry ? 'Abbrechen' : 'Eintrag hinzufuegen'}
            </button>
            <Link
              href="/garage"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Zurueck zur Garage
            </Link>
            <a
              href={`/api/cars/${carId}/export/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              PDF exportieren
            </a>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionTile
            href={`/market/new?carId=${carId}`}
            label="TEIL VERKAUFEN"
            iconToneClass="border-rose-500/25 bg-rose-500/10 text-rose-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" />
                <path d="M7 7h.01" />
              </svg>
            }
          />
          <QuickActionTile
            href={`/events/new?carId=${carId}`}
            label="TRACKDAYS"
            iconToneClass="border-amber-500/25 bg-amber-500/10 text-amber-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22V4a2 2 0 0 1 2-2h12l-2 6 2 6H6" />
              </svg>
            }
          />
          <QuickActionTile
            href="#settings"
            label="EINSTELLUNGEN"
            iconToneClass="border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21v-7" />
                <path d="M4 10V3" />
                <path d="M12 21v-9" />
                <path d="M12 8V3" />
                <path d="M20 21v-5" />
                <path d="M20 12V3" />
                <path d="M2 14h4" />
                <path d="M10 8h4" />
                <path d="M18 16h4" />
              </svg>
            }
          />
          <QuickActionTile
            href="#stats"
            label="STATISTIK"
            iconToneClass="border-sky-500/25 bg-sky-500/10 text-sky-300"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 15v-6" />
                <path d="M12 15V6" />
                <path d="M17 15v-9" />
              </svg>
            }
          />
        </div>

        {showNewEntry ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] animate-in fade-in slide-in-from-top-4 duration-300">
            <NewEntryForm
              carId={carId || ''}
              onSubmitSuccess={async () => {
                setShowNewEntry(false)
                await loadCar()
                await loadDocuments()
              }}
            />
          </div>
        ) : null}

      {/* Hero Section */}
        <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/40 flex items-center justify-center">
          {car.heroImage ? (
            <button
              type="button"
              onClick={() => setHeroPreviewOpen(true)}
              className="group absolute inset-0 cursor-zoom-in"
              title="In voller Groesse ansehen"
            >
              <Image
                src={car.heroImage}
                alt={car.make}
                fill
                sizes="(max-width: 768px) 100vw, 1200px"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                unoptimized={typeof car.heroImage === 'string' && car.heroImage.startsWith('data:')}
                priority
              />
            </button>
          ) : (
            <div className="text-center">
              <span className="text-zinc-500 text-lg">Hero-Bild</span>
              <p className="text-zinc-600 text-sm mt-2">800×400</p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
                {projectGoalLabels[car.projectGoal]}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
                {buildStatusLabels[car.buildStatus]}
              </span>
            </div>
            <div className="text-sm text-zinc-200/90">
              {car.currentMileage != null ? `${car.currentMileage.toLocaleString()} km` : '— km'}
            </div>
          </div>
        </div>

      {/* Quick Stats */}
        <div id="stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4 scroll-mt-24">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <p className="text-sm text-zinc-400">Modifikationen</p>
          <p className="text-2xl font-bold text-white">{totalMods}</p>
        </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <p className="text-sm text-zinc-400">Trackdays</p>
          <p className="text-2xl font-bold text-white">{totalTrackDays}</p>
        </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <p className="text-sm text-zinc-400">Gesamt</p>
          <p className="text-2xl font-bold text-white">€{totalSpent.toLocaleString()}</p>
        </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <p className="text-sm text-zinc-400">Leistung</p>
          <p className="text-2xl font-bold text-white">{car.factoryHp || '—'} hp</p>
        </div>
      </div>

      {/* Car Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <h3 className="text-lg font-semibold text-white mb-4">Technische Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Baujahr</p>
              <p className="text-white">{car.year || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-400">Motor</p>
              <p className="text-white">{car.engineCode || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-400">Leistung</p>
              <p className="text-white">{car.factoryHp || '—'} hp</p>
            </div>
            <div>
              <p className="text-zinc-400">Antrieb</p>
              <p className="text-white">{car.drive || '—'} • {car.transmission || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-400">Gewicht</p>
              <p className="text-white">{car.factoryWeight || '—'} kg</p>
            </div>
            <div>
              <p className="text-zinc-400">Kennzeichen</p>
              <p className="text-white">—</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-zinc-400">Naechster TÜV</p>
                <p className="text-white">
                  —
                </p>
              </div>
              <TuvBadge status="GREEN_REGISTERED" />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-zinc-400">Letzter Service</p>
                <p className="text-white">
                  —
                </p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                OK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Actions */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <h3 className="text-lg font-semibold text-white mb-4">Aktionen</h3>
        <div className="flex flex-wrap gap-4">
          <label
            className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 border border-white/10 ${
              heroUploading
                ? 'bg-white/5 text-zinc-400 cursor-not-allowed'
                : 'bg-white/5 hover:bg-white/10 text-white cursor-pointer'
            }`}
            title={heroUploading ? 'Wird hochgeladen...' : 'Hero-Bild hochladen (automatisch optimiert)'}
          >
            {car.heroImage ? 'Hero aendern' : 'Hero hochladen'}
            <input
              type="file"
              accept="image/*"
              disabled={heroUploading}
              onChange={(e) => {
                const input = e.currentTarget
                const file = input.files?.[0] || null
                input.value = ''
                if (file) void uploadHeroImage(file)
              }}
              className="hidden"
            />
          </label>
          {car.heroImage ? (
            <button
              type="button"
              onClick={removeHeroImage}
              disabled={heroUploading}
              className="px-4 py-2 border border-red-500/25 bg-red-500/15 hover:bg-red-500/20 disabled:bg-red-500/10 text-red-200 font-semibold rounded-lg transition-colors flex items-center gap-2"
              title="Hero-Bild entfernen"
            >
              Hero entfernen
            </button>
          ) : null}
          <button
            onClick={createShareLink}
            disabled={shareLoading || visibility === 'PRIVATE'}
            className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            title={visibility === 'PRIVATE' ? 'Private Builds koennen nicht geteilt werden' : 'Erstellt einen schreibgeschuetzten Link zu deinem Build Passport'}
          >
            {shareLoading ? 'Link wird erstellt...' : 'Build teilen'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Ablauf</span>
            <select
              value={shareExpiresInDays}
              onChange={(e) => setShareExpiresInDays(Number(e.target.value) as any)}
              className="px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              title="Wie lange dieser Share-Link gueltig bleibt"
            >
              <option value={7}>7 Tage</option>
              <option value={30}>30 Tage</option>
              <option value={0}>Nie</option>
            </select>
          </div>
          {forSale && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-green-400 font-semibold">Zu verkaufen</span>
              {askingPrice && (
                <span className="text-white font-bold">€{Number(askingPrice).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
        {shareUrl && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-zinc-400">Share-Link (in die Zwischenablage kopiert)</p>
            <a className="text-sky-400 hover:text-sky-300 break-all" href={shareUrl} target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </div>
        )}
        {shareLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <p className="text-sm text-zinc-400">Aktive Links</p>
            <div className="space-y-2">
              {shareLinks.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 bg-zinc-950/30 border border-white/10 rounded-lg p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${l.revokedAt ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {l.revokedAt ? 'Widerrufen' : 'Aktiv'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Aufrufe: {l._count?.views ?? 0}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Eindeutige: {l.uniqueViewers ?? 0}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Letzter Aufruf: {l.lastViewedAt ? new Date(l.lastViewedAt).toLocaleString('de-DE') : '—'}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Erstellt: {new Date(l.createdAt).toLocaleDateString('de-DE')}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {l.expiresAt ? `Laeuft ab: ${new Date(l.expiresAt).toLocaleDateString('de-DE')}` : 'Kein Ablauf'}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => copyShareLink(l.token)}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded"
                      title={car?.slug ? 'Kopiert die Share-URL' : 'Kopiert das Token'}
                    >
                      Kopieren
                    </button>
                    <button
                      onClick={() => revokeShareLink(l.id)}
                      disabled={shareLoading || Boolean(l.revokedAt)}
                      className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/30 text-white text-sm rounded"
                    >
                      Widerrufen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {heroError && <p className="text-red-400 text-sm mt-2">{heroError}</p>}
        {shareError && <p className="text-red-400 text-sm mt-2">{shareError}</p>}
        <div id="settings" className="mt-4 pt-4 border-t border-white/10 scroll-mt-24">
          <p className="text-sm text-zinc-400 mb-2">Build-Passport Einstellungen</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Sichtbarkeit</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Car['visibility'])}
                className="px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              >
                <option value="PUBLIC">Oeffentlich</option>
                <option value="UNLISTED">Nicht gelistet (Link)</option>
                <option value="PRIVATE">Privat (nur ich)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Build-Status</label>
              <select
                value={buildStatus}
                onChange={(e) => setBuildStatus(e.target.value as Car['buildStatus'])}
                className="px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              >
                <option value="IN_PROGRESS">In Arbeit</option>
                <option value="TUV_READY">TUEV bereit</option>
                <option value="TRACK_READY">Track bereit</option>
                <option value="DAILY_READY">Alltag bereit</option>
              </select>
            </div>
            <button
              onClick={saveVisibilityAndStatus}
              disabled={savingMeta}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              {savingMeta ? 'Speichere...' : 'Build-Einstellungen speichern'}
            </button>
          </div>
          {metaError && <p className="text-red-400 text-sm mt-2">{metaError}</p>}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forSale"
              checked={forSale}
              onChange={(e) => setForSale(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-900/60 border-white/10"
            />
            <label htmlFor="forSale" className="text-zinc-300">Zum Verkauf anbieten</label>
          </div>
          {forSale && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">€</span>
              <input
                type="number"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="Preis"
                className="w-40 px-3 py-1 bg-zinc-900/60 border border-white/10 rounded text-white"
              />
            </div>
          )}
          <button
            onClick={saveSaleStatus}
            disabled={savingSale}
            className="ml-auto px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {savingSale ? 'Speichere...' : 'Verkaufsstatus speichern'}
          </button>
        </div>
        {saveError && (
          <p className="text-red-400 text-sm mt-2">{saveError}</p>
        )}
      </div>

      {/* Journal Section */}
      <div className="space-y-6">
        <div id="journal" className="flex justify-between items-center scroll-mt-24">
          <h2 className="text-2xl font-bold text-white">Journal</h2>
        </div>

        <div className="space-y-4">
          {car.logEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl bg-zinc-950/40 p-4 border border-white/10 hover:border-white/20 transition-colors shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-20 text-center">
                  <p className="text-sm text-zinc-400">
                    {new Date(entry.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-zinc-500">{new Date(entry.date).getFullYear()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded text-white ${typeColors[entry.type]}`}>
                      {entry.type.replace('_', ' ')}
                    </span>
                    {entry.modifications[0]?.tuvStatus && <TuvBadge status={entry.modifications[0].tuvStatus} />}
                    {entry.totalCostImpact && (
                      <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded">
                        €{Number(entry.totalCostImpact).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-white">{entry.title}</h3>
                  {entry.type === 'MODIFICATION' && (
                    <Link
                      href={
                        entry.modifications[0]?.id
                          ? `/market/new?modificationId=${entry.modifications[0].id}`
                          : `/market/new?carId=${carId || car.id}`
                      }
                      className="inline-block mt-2 text-sm text-sky-400 hover:text-sky-300"
                    >
                      Dieses Teil verkaufen →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Work Plan */}
      <div id="work-plan" className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] scroll-mt-24">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-white">Arbeitsplan</h3>
          <button
            onClick={loadTasks}
            disabled={tasksLoading}
            className="px-3 py-2 border border-white/10 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:opacity-60 text-white text-sm rounded"
          >
            {tasksLoading ? 'Lade...' : 'Aktualisieren'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-zinc-500 mb-1">Neue Aufgabe</label>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="z.B. Raeder fuer TUEV"
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Faellig am</label>
            <input
              type="date"
              value={taskDueAt}
              onChange={(e) => setTaskDueAt(e.target.value)}
              className="px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
            />
          </div>
          <button
            onClick={createTask}
            disabled={tasksLoading || !taskTitle.trim()}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            Hinzufuegen
          </button>
        </div>

        {tasksError && <p className="text-red-400 text-sm mt-3">{tasksError}</p>}

        <div className="mt-4 space-y-2">
          {tasks.length === 0 && !tasksLoading && (
            <p className="text-zinc-400 text-sm">Noch keine Aufgaben.</p>
          )}
          {tasks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 bg-zinc-950/30 border border-white/10 rounded-lg p-3">
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-200">
                {t.status}
              </span>
              <span className={`text-white ${t.status === 'DONE' ? 'line-through opacity-70' : ''}`}>
                {t.title}
              </span>
              <span className="text-xs text-zinc-500">
                {t.dueAt ? `Faellig: ${new Date(t.dueAt).toLocaleDateString('de-DE')}` : 'Kein Datum'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setTaskStatus(t.id, 'TODO')}
                  disabled={tasksLoading || t.status === 'TODO'}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/40 text-white text-sm rounded"
                >
                  Offen
                </button>
                <button
                  onClick={() => setTaskStatus(t.id, 'IN_PROGRESS')}
                  disabled={tasksLoading || t.status === 'IN_PROGRESS'}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/40 text-white text-sm rounded"
                >
                  In Arbeit
                </button>
                <button
                  onClick={() => setTaskStatus(t.id, 'DONE')}
                  disabled={tasksLoading || t.status === 'DONE'}
                  className="px-3 py-1.5 bg-green-600/80 hover:bg-green-600 disabled:bg-green-600/30 text-white text-sm rounded"
                >
                  Erledigt
                </button>
                <button
                  onClick={() => deleteTask(t.id)}
                  disabled={tasksLoading}
                  className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/30 text-white text-sm rounded"
                >
                  Loeschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div id="documents" className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] scroll-mt-24">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-white">Dokumente</h3>
          <button
            onClick={loadDocuments}
            disabled={docsLoading}
            className="px-3 py-2 border border-white/10 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:opacity-60 text-white text-sm rounded"
          >
            {docsLoading ? 'Lade...' : 'Aktualisieren'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Typ</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
            >
              <option value="ABE">ABE</option>
              <option value="EINTRAGUNG">Eintragung</option>
              <option value="RECEIPT">Beleg</option>
              <option value="SERVICE">Service</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sichtbarkeit</label>
            <select
              value={docVisibility}
              onChange={(e) => setDocVisibility(e.target.value as Document['visibility'])}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
            >
              <option value="SELF">Nur ich</option>
              <option value="LINK">Link</option>
              <option value="PUBLIC">Oeffentlich</option>
              <option value="NONE">Keine</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Titel (optional)</label>
            <input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              placeholder="z.B. ABE-741163"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Aussteller (optional)</label>
            <input
              value={docIssuer}
              onChange={(e) => setDocIssuer(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              placeholder="z.B. KBA / TUEV"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nummer (optional)</label>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              placeholder="z.B. ABE-123456"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1">URL</label>
            <input
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
              placeholder="https://... oder /pfad"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1">Upload (PDF oder Bild)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-zinc-900/60 border border-white/10 rounded text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">Wenn eine Datei ausgewaehlt ist, wird sie hochgeladen und als Dokument-URL verwendet.</p>
          </div>
          <div className="md:col-span-2">
            <button
              onClick={createDocument}
              disabled={docsLoading || (!docUrl.trim() && !docFile)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              Dokument hinzufuegen
            </button>
          </div>
        </div>

        {docsError && <p className="text-red-400 text-sm mt-3">{docsError}</p>}

        <div className="mt-4 space-y-2">
          {documents.length === 0 && !docsLoading && (
            <p className="text-zinc-400 text-sm">Noch keine Dokumente.</p>
          )}
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 bg-zinc-950/30 border border-white/10 rounded-lg p-3">
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-200">{d.type}</span>
              <select
                value={d.visibility}
                onChange={(e) => setDocumentVisibility(d.id, e.target.value as Document['visibility'])}
                disabled={docsLoading}
                className="px-2 py-1 bg-zinc-900/60 border border-white/10 rounded text-xs text-zinc-100"
                aria-label="Dokument-Sichtbarkeit"
                title="Dokument-Sichtbarkeit"
              >
                <option value="SELF">Nur ich</option>
                <option value="LINK">Link</option>
                <option value="PUBLIC">Oeffentlich</option>
                <option value="NONE">Keine</option>
              </select>
              <span className="text-white">{d.title || d.documentNumber || d.url}</span>
              <span className="text-xs text-zinc-500">{new Date(d.uploadedAt).toLocaleDateString('de-DE')}</span>
              <a className="text-sky-400 hover:text-sky-300 text-sm break-all" href={d.url} target="_blank" rel="noreferrer">
                Oeffnen
              </a>
              <div className="ml-auto">
                <button
                  onClick={() => deleteDocument(d.id)}
                  disabled={docsLoading}
                  className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/30 text-white text-sm rounded"
                >
                  Loeschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back Link */}
      <Link href="/garage" className="text-zinc-400 hover:text-white transition-colors">
        ← Zurueck zur Garage
      </Link>
    </div>
    </div>
  )
}
