'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { TuvBadge } from '@/components/TuvBadge'
import { useSession } from 'next-auth/react'
import MarketSoonBanner from '@/components/MarketSoonBanner'
import ImageLightbox from '@/components/ImageLightbox'

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

type Listing = {
  id: string
  title: string
  description: string | null
  price: number
  condition: 'NEW' | 'LIKE_NEW' | 'USED'
  mileageOnCar: number | null
  car: { make: string; model: string; generation: string | null; heroImage?: string | null } | null
  createdAt: string
  seller: { id: string; name: string | null }
  modification: {
    id: string
    partName: string
    brand: string | null
    category?: string
    tuvStatus?: 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'
  } | null
  images?: string[]
  evidenceScore?: number
  evidenceTier?: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE'
  category?: string
  partNumber?: string
  compatibility?: string[]
}

const conditionLabels = {
  NEW: 'Neu',
  LIKE_NEW: 'Wie neu',
  USED: 'Gebraucht',
} as const

const conditionColors = {
  NEW: 'bg-green-500',
  LIKE_NEW: 'bg-blue-500',
  USED: 'bg-zinc-500',
} as const

export default function MarketListingPage() {
  const routeParams = useParams<{ id?: string | string[] }>()
  const listingId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id

  const { data: session } = useSession()
  const commerceEnabled = (process.env.NEXT_PUBLIC_MARKET_COMMERCE_ENABLED || '').trim() === 'true'
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [contactMessage, setContactMessage] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [sending, setSending] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [buying, setBuying] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  async function ensureConversation(): Promise<string> {
    if (!session?.user?.id) throw new Error('Bitte anmelden, um den Verkaeufer zu kontaktieren.')
    if (conversationId) return conversationId

    if (!listingId) throw new Error('Listing-ID fehlt.')
    const res = await fetch(`/api/market/listings/${listingId}/conversation`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Konversation konnte nicht gestartet werden.')
    const id = String(data.conversationId || '')
    if (!id) throw new Error('Ungueltige Serverantwort.')
    setConversationId(id)
    return id
  }

  async function loadConversation(id: string) {
    const res = await fetch(`/api/market/conversations/${id}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Konversation konnte nicht geladen werden.')
    setMessages(Array.isArray(data.conversation?.messages) ? data.conversation.messages : [])
    setOffers(Array.isArray(data.conversation?.offers) ? data.conversation.offers : [])
  }

  async function handleContactSeller(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = contactMessage.trim()
    if (!trimmed) return
    setSending(true)
    setActionError(null)
    try {
      const id = await ensureConversation()
      const res = await fetch(`/api/market/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Nachricht konnte nicht gesendet werden.')
      setContactSuccess(true)
      setShowContactForm(false)
      setContactMessage('')
      await loadConversation(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setSending(false)
    }
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault()
    const raw = offerAmount.trim()
    if (!raw) return

    setSending(true)
    setActionError(null)
    try {
      const id = await ensureConversation()
      const eur = Number(raw)
      if (!Number.isFinite(eur) || eur <= 0) throw new Error('Ungueltiger Angebotsbetrag.')
      const res = await fetch(`/api/market/conversations/${id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: Math.round(eur * 100), currency: 'EUR' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Angebot konnte nicht gesendet werden.')
      setShowOfferModal(false)
      setOfferAmount('')
      await loadConversation(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setSending(false)
    }
  }

  async function startCheckout(opts?: { offerId?: string }) {
    if (!listing) return
    setBuying(true)
    setActionError(null)
    try {
      const res = await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, offerId: opts?.offerId, termsAccepted }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden.')
      const url = String(data.url || '')
      if (!url) throw new Error('Ungueltige Serverantwort.')
      window.location.href = url
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setBuying(false)
    }
  }

  useEffect(() => {
    if (!contactSuccess) return
    const timer = setTimeout(() => setContactSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [contactSuccess])

  useEffect(() => {
    async function loadListing() {
      try {
        setLoading(true)
        if (!listingId) return
        const res = await fetch(`/api/market/listings/${listingId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Angebot nicht gefunden')
        }
        const data = await res.json()
        setListing(data.listing)
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
      } finally {
        setLoading(false)
      }
    }
    loadListing()
  }, [listingId])

  if (loading) {
    return <div className="text-center text-zinc-400">Lade Angebot...</div>
  }

  if (pageError || !listing) {
    return <div className="text-center text-zinc-400">{pageError || 'Angebot nicht gefunden'}</div>
  }

  const isSeller = session?.user?.id === listing.seller.id
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : (listing.car?.heroImage ? [listing.car.heroImage] : [])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ImageLightbox
        open={lightboxOpen}
        images={images}
        initialIndex={lightboxIndex}
        alt={listing.title}
        onClose={() => setLightboxOpen(false)}
      />
      <MarketSoonBanner />
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/market" className="hover:text-white transition-colors">
          Marktplatz
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            {images.length > 0 ? (
              <button
                type="button"
                className="group block w-full h-full cursor-zoom-in border border-transparent hover:border-sky-400 transition-all hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_28px_rgba(56,189,248,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 relative"
                title="Bilder ansehen"
                onClick={() => {
                  setLightboxIndex(0)
                  setLightboxOpen(true)
                }}
              >
                <img
                  src={images[0]}
                  alt={listing.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <span className="text-zinc-500 text-lg">Hauptbild</span>
                  <p className="text-zinc-600 text-sm mt-2">800×600</p>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(images.length > 0 ? images : [null, null, null, null]).slice(0, 4).map((img, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border border-white/10 bg-zinc-950/40 flex items-center justify-center overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                {img ? (
                  <button
                    type="button"
                    className="group block w-full h-full cursor-zoom-in border border-transparent hover:border-sky-400 transition-all hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_22px_rgba(56,189,248,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 relative"
                    title="Bilder ansehen"
                    onClick={() => {
                      setLightboxIndex(i)
                      setLightboxOpen(true)
                    }}
                  >
                    <img
                      src={img}
                      alt={`${listing.title} ${i + 1}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ) : (
                  <span className="text-zinc-500 text-sm">{i + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Beschreibung</h2>
            <p className="text-zinc-300 whitespace-pre-line">{listing.description || 'Keine Beschreibung vorhanden.'}</p>
          </div>

          {/* Compatibility */}
          <div className="panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Kompatibilitaet</h2>
            <div className="flex flex-wrap gap-2">
          {(listing.compatibility || []).map((car) => (
            <span
              key={car}
              className="px-3 py-1 rounded-full text-sm border border-white/10 bg-white/5 text-zinc-200"
            >
                  {car}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Details & Buy */}
        <div className="space-y-6">
          {/* Title & Price */}
          <div className="panel p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-semibold text-white">{listing.title}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded text-white ${conditionColors[listing.condition]}`}>
                {conditionLabels[listing.condition]}
              </span>
            </div>
            <p className="text-4xl font-bold text-sky-500 mb-4">€{listing.price.toLocaleString()}</p>
            {(listing.evidenceScore || 0) > 0 && (
              <div
                className={[
                  'mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
                  listing.evidenceTier === 'GOLD'
                    ? 'border-amber-500/45 bg-amber-500/15 text-amber-300'
                    : listing.evidenceTier === 'SILVER'
                      ? 'border-slate-300/25 bg-slate-200/10 text-slate-200'
                      : listing.evidenceTier === 'BRONZE'
                        ? 'border-orange-500/35 bg-orange-500/15 text-orange-300'
                        : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                ].join(' ')}
              >
                Nachweis: {Math.round(listing.evidenceScore || 0)}%
              </div>
            )}
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <span>Kategorie</span>
                <span className="text-white">{listing.modification?.category ? listing.modification.category.replace('_', ' ') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Teilenummer</span>
                <span className="text-white">{listing.partNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Vom Fahrzeug</span>
                <span className="text-white">
                  {listing.car ? `${listing.car.make} ${listing.car.model} ${listing.car.generation || ''}` : '—'}
                </span>
              </div>
              {listing.mileageOnCar && (
                <div className="flex justify-between">
                  <span>Laufleistung am Fahrzeug</span>
                  <span className="text-white">{listing.mileageOnCar.toLocaleString()} km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Eingestellt</span>
                <span className="text-white">
                  {new Date(listing.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            {listing.modification?.tuvStatus && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-zinc-400 mb-2">TÜV Status</p>
                <TuvBadge status={listing.modification.tuvStatus} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="panel p-6 space-y-3">
            {commerceEnabled && !isSeller ? (
              <label className="flex items-start gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 checkbox-base"
                />
                <span>
                  Ich akzeptiere{' '}
                  <Link className="text-sky-400 hover:text-sky-300" href="/agb">
                    AGB
                  </Link>
                  ,{' '}
                  <Link className="text-sky-400 hover:text-sky-300" href="/widerruf">
                    Widerruf
                  </Link>
                  {' '}und{' '}
                  <Link className="text-sky-400 hover:text-sky-300" href="/datenschutz">
                    Datenschutz
                  </Link>
                  .
                </span>
              </label>
            ) : null}
            <button
              onClick={() => startCheckout()}
              disabled={buying || !session?.user?.id || isSeller || !commerceEnabled || (commerceEnabled && !termsAccepted)}
              title={
                !commerceEnabled
                  ? 'BALD'
                  : !session?.user?.id
                    ? 'Bitte anmelden, um zu kaufen'
                    : commerceEnabled && !termsAccepted
                      ? 'Bitte AGB/Widerruf akzeptieren, um fortzufahren'
                      : undefined
              }
              className="w-full px-4 py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {buying ? 'Weiterleitung...' : 'Jetzt kaufen'}
            </button>
            {!isSeller && (
              <>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full px-4 py-3 btn-secondary"
                >
                  Verkaeufer kontaktieren
                </button>
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="w-full px-4 py-3 btn-secondary"
                >
                  Angebot machen
                </button>
              </>
            )}
            {isSeller && (
              <Link
                href="/settings/messages"
                className="block w-full px-4 py-3 btn-secondary text-center"
              >
                Nachrichten ansehen
              </Link>
            )}
            {isSeller && (
              <Link
                href={`/market/${listing.id}/edit`}
                className="block w-full px-4 py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors text-center"
              >
                Angebot bearbeiten
              </Link>
            )}
            {actionError ? <p className="text-sm text-red-400">{actionError}</p> : null}
          </div>

          {/* Seller Info */}
          <div className="panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Verkaeufer</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
                  {(listing.seller.name || 'S')[0]}
                </div>
                <div>
                  <p className="font-semibold text-white">{listing.seller.name || 'Verkaeufer'}</p>
                  <p className="text-sm text-zinc-400">—</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Mitgliedsdaten nicht verfuegbar
              </p>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="panel-soft p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Sicherheitstipps</h4>
            <ul className="text-xs text-zinc-400 space-y-1">
              <li>Treffe dich an einem sicheren Ort</li>
              <li>Artikel vor der Zahlung pruefen</li>
              <li>Sichere Zahlungsmethoden verwenden</li>
              <li>Quittungen/Nachweise anfordern</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Verkaeufer kontaktieren</h2>
            {messages.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-zinc-950/30 p-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderId === session?.user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-lg bg-sky-500/20 border border-sky-500/40 px-3 py-2">
                      <p className="text-sm text-white break-words">{message.body}</p>
                      <p className="mt-1 text-[11px] text-zinc-300 text-right">
                        {new Date(message.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleContactSeller} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Nachricht
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Hallo, ich interessiere mich fuer den Artikel..."
                  rows={4}
                  required
                  className="textarea-base resize-none"
                />
              </div>
              {actionError && <p className="text-sm text-red-400">{actionError}</p>}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {sending ? 'Sende...' : 'Nachricht senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Angebot machen</h2>
            {offers.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-sm text-zinc-300">
                Letztes Angebot: €{(offers[0].amountCents / 100).toLocaleString()} ({offers[0].status})
              </div>
            )}
            <form onSubmit={submitOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Betrag (EUR)</label>
                <input
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="z.B. 2500"
                  className="input-base"
                />
              </div>
              {actionError && <p className="text-sm text-red-400">{actionError}</p>}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {sending ? 'Sende...' : 'Angebot senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {contactSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg text-sm">
          Nachricht an Verkaeufer gesendet.
        </div>
      )}
    </div>
  )
}
