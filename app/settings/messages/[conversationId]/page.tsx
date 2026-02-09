'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Message = {
  id: string
  body: string
  createdAt: string
  senderId: string
}

type Offer = {
  id: string
  amountCents: number
  currency: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  createdAt: string
  createdById: string
}

type Conversation = {
  id: string
  buyerId: string
  sellerId: string
  buyer: { id: string; name: string | null }
  seller: { id: string; name: string | null }
  partListing: { id: string; title: string; price: number; images?: string[] }
  messages: Message[]
  offers: Offer[]
}

export default function MessageThreadPage() {
  const { data: session } = useSession()
  const params = useParams<{ conversationId: string }>()
  const conversationId = params.conversationId
  const commerceEnabled = process.env.NEXT_PUBLIC_MARKET_COMMERCE_ENABLED === 'true'
  const [conv, setConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/market/conversations/${conversationId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Konversation konnte nicht geladen werden')
      setConv(data.conversation || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = message.trim()
    if (!body) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/market/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Nachricht konnte nicht gesendet werden')
      setMessage('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setSending(false)
    }
  }

  async function updateOffer(offerId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/market/conversations/${conversationId}/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Angebot konnte nicht aktualisiert werden')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setSending(false)
    }
  }

  async function payOffer(offerId: string) {
    if (!conv) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: conv.partListing.id, offerId, termsAccepted }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden')
      const url = String(data.url || '')
      if (!url) throw new Error('Ungueltige Serverantwort')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-zinc-400">Lade...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (!conv) return <p className="text-zinc-400">Konversation nicht gefunden.</p>

  const userId = session?.user?.id || ''
  const isSeller = userId && userId === conv.sellerId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="text-sm text-zinc-400">
        <Link href="/settings/messages" className="hover:text-white transition-colors">
          Nachrichten
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/market/${conv.partListing.id}`} className="hover:text-white transition-colors">
          {conv.partListing.title}
        </Link>
      </nav>

      <div className="panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">{conv.partListing.title}</h1>
            <p className="text-sm text-zinc-400">€{conv.partListing.price.toLocaleString()}</p>
          </div>
          <Link
            href={`/market/${conv.partListing.id}`}
            className="px-3 py-2 rounded-lg btn-secondary text-sm"
          >
            Anzeige oeffnen
          </Link>
        </div>
      </div>

      {conv.offers.length > 0 && (
        <div className="panel p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Angebote</h2>
          {commerceEnabled && !isSeller ? (
            <label className="flex items-start gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 checkbox-base"
              />
              <span>
                I agree to{' '}
                <Link className="text-sky-400 hover:text-sky-300" href="/agb">
                  AGB
                </Link>
                ,{' '}
                <Link className="text-sky-400 hover:text-sky-300" href="/widerruf">
                  Widerruf
                </Link>
                , and{' '}
                <Link className="text-sky-400 hover:text-sky-300" href="/datenschutz">
                  Datenschutz
                </Link>
                .
              </span>
            </label>
          ) : null}
          {conv.offers.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/30 p-3">
              <div className="text-sm text-zinc-200">
                <span className="font-semibold">€{(o.amountCents / 100).toLocaleString()}</span>{' '}
                <span className="text-zinc-400">({o.status})</span>
                <div className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString('de-DE')}</div>
              </div>
              {o.status === 'PENDING' && userId ? (
                <div className="flex gap-2">
                  {isSeller ? (
                    <>
                      <button
                        onClick={() => updateOffer(o.id, 'ACCEPT')}
                        disabled={sending}
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white text-sm"
                      >
                        Annehmen
                      </button>
                      <button
                        onClick={() => updateOffer(o.id, 'DECLINE')}
                        disabled={sending}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 text-white text-sm"
                      >
                        Ablehnen
                      </button>
                    </>
                  ) : o.createdById === userId ? (
                    <button
                      onClick={() => updateOffer(o.id, 'CANCEL')}
                      disabled={sending}
                      className="px-3 py-2 rounded-lg btn-secondary disabled:opacity-60 text-sm"
                    >
                      Abbrechen
                    </button>
                  ) : null}
                </div>
              ) : o.status === 'ACCEPTED' && userId && !isSeller && o.createdById === userId ? (
                <button
                  onClick={() => payOffer(o.id)}
                  disabled={sending || !commerceEnabled || (commerceEnabled && !termsAccepted)}
                  title={!commerceEnabled ? 'BALD' : commerceEnabled && !termsAccepted ? 'AGB/Widerruf akzeptieren, um fortzufahren' : undefined}
                  className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white text-sm"
                >
                  Jetzt bezahlen
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="panel p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
        <div className="max-h-[420px] overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-zinc-950/30 p-3">
          {conv.messages.length === 0 ? <p className="text-sm text-zinc-400">Noch keine Nachrichten.</p> : null}
          {conv.messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] rounded-lg bg-sky-500/15 border border-sky-500/30 px-3 py-2">
                <p className="text-sm text-white break-words">{m.body}</p>
                <p className="mt-1 text-[11px] text-zinc-300 text-right">{new Date(m.createdAt).toLocaleString('de-DE')}</p>
              </div>
            </div>
          ))}
        </div>

        {!userId ? (
          <p className="text-sm text-zinc-400">Anmelden, um zu antworten.</p>
        ) : (
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht schreiben..."
              className="flex-1 input-base"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              Senden
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
