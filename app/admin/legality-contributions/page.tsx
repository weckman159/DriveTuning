'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Contribution = {
  id: string
  approvalType: string
  approvalNumber: string | null
  inspectionOrg: string
  inspectionDate: string
  notes: string | null
  status: string
  isAnonymous: boolean
  hasDocuments: boolean
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
  modification: {
    id: string
    partName: string
    brand: string | null
    category: string
    car: { id: string; make: string; model: string; year: number | null }
  }
}

export default function LegalityContributionsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Contribution[]>([])

  const count = useMemo(() => items.length, [items])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/legality-contributions')
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(String(data?.error || 'Fehler beim Laden'))
        setItems([])
        return
      }
      setItems(Array.isArray(data?.contributions) ? data.contributions : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Netzwerkfehler')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function review(id: string, decision: 'APPROVED' | 'REJECTED') {
    const rejectionReason =
      decision === 'REJECTED' ? window.prompt('Grund (optional):') || null : null

    const res = await fetch(`/api/admin/legality-contributions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, rejectionReason }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      window.alert(String(data?.error || 'Fehler'))
      return
    }
    await load()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Legality Contributions</h1>
          <div className="text-sm text-zinc-400">{count} ausstehend</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} className="px-4 py-2 btn-secondary">
            {loading ? 'Lade...' : 'Aktualisieren'}
          </button>
          <Link href="/" className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded text-white text-sm">
            Home
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-zinc-400">Lade...</div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="panel p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-white font-semibold">
                    {c.modification.brand ? `${c.modification.brand} ` : ''}
                    {c.modification.partName}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {c.modification.car.make} {c.modification.car.model} {c.modification.car.year || ''} · {c.approvalType}
                    {c.approvalNumber ? ` · ${c.approvalNumber}` : ''}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {String(c.inspectionOrg).toUpperCase()} · {new Date(c.inspectionDate).toLocaleDateString('de-DE')}
                    {c.hasDocuments ? ' · docs' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => review(c.id, 'APPROVED')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => review(c.id, 'REJECTED')}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                User: {c.user.email || c.user.name || c.user.id} {c.isAnonymous ? '(anonymous display)' : '(public name)'}
              </div>

              {c.notes ? (
                <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-sm text-zinc-300 whitespace-pre-wrap">
                  {c.notes}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center text-zinc-400">Keine ausstehenden Beitraege</div>
      )}
    </div>
  )
}

