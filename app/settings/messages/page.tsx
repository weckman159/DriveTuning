'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Conversation = {
  id: string
  updatedAt: string
  partListing: { id: string; title: string; price: number }
  buyer: { id: string; name: string | null }
  seller: { id: string; name: string | null }
  messages: { id: string; body: string; createdAt: string; senderId: string }[]
}

export default function MessagesPage() {
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/market/conversations')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Konversationen konnten nicht geladen werden')
        setItems(Array.isArray(data.conversations) ? data.conversations : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="text-sm text-zinc-400">
        <Link href="/settings" className="hover:text-white transition-colors">
          Einstellungen
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Nachrichten</span>
      </nav>

      <div>
        <h1 className="text-3xl font-semibold text-white">Nachrichten</h1>
        <p className="text-zinc-400 mt-1">Marktplatz-Konversationen</p>
      </div>

      {loading ? <p className="text-zinc-400">Lade...</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="text-zinc-400">Noch keine Konversationen.</p>
      ) : null}

      <div className="space-y-3">
        {items.map((c) => {
          const last = c.messages?.[0]
          return (
            <div key={c.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{c.partListing.title}</p>
                  <p className="text-sm text-zinc-400">€{c.partListing.price.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/settings/messages/${c.id}`}
                    className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm"
                  >
                    Chat oeffnen
                  </Link>
                  <Link
                    href={`/market/${c.partListing.id}`}
                    className="px-3 py-2 rounded-lg btn-secondary text-sm"
                  >
                    Anzeige
                  </Link>
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-300">
                {last ? (
                  <>
                    <p className="line-clamp-2">{last.body}</p>
                    <p className="mt-1 text-xs text-zinc-500">{new Date(last.createdAt).toLocaleString('de-DE')}</p>
                  </>
                ) : (
                  <p className="text-zinc-500">Noch keine Nachrichten.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
