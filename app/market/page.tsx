'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TuvBadge } from '@/components/TuvBadge'
import MarketSoonBanner from '@/components/MarketSoonBanner'
import ImageLightbox from '@/components/ImageLightbox'

type Listing = {
  id: string
  title: string
  price: number
  condition: 'NEW' | 'LIKE_NEW' | 'USED'
  mileageOnCar: number | null
  car: { make: string; model: string; generation: string | null; heroImage?: string | null } | null
  createdAt: string
  images?: string[]
  evidenceScore?: number
  evidenceTier?: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE'
  seller: { id: string; name: string | null }
  modification?: {
    category?: string
    tuvStatus?: 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'
  }
}

const makes = ['BMW', 'Audi', 'Porsche', 'Mercedes', 'Ford', 'Volkswagen']
const categories = ['SUSPENSION', 'ENGINE', 'EXHAUST', 'BRAKES', 'WHEELS', 'AERO', 'INTERIOR', 'ELECTRONICS']
const conditions = ['NEW', 'LIKE_NEW', 'USED'] as const
type Condition = typeof conditions[number]

const conditionColors = {
  NEW: 'bg-green-500',
  LIKE_NEW: 'bg-blue-500',
  USED: 'bg-zinc-500',
} as const

const conditionLabels = {
  NEW: 'Neu',
  LIKE_NEW: 'Wie neu',
  USED: 'Gebraucht',
} as const

export default function MarketPage() {
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxAlt, setLightboxAlt] = useState('')

  useEffect(() => {
    async function loadListings() {
      try {
        setLoading(true)
        const res = await fetch('/api/market/listings')
        const data = await res.json()
        setListings(data.listings || [])
      } finally {
        setLoading(false)
      }
    }
    loadListings()
  }, [])

  const filteredListings = listings.filter((listing) => {
    if (selectedMake && listing.car?.make !== selectedMake) return false
    if (selectedCategory && listing.modification?.category !== selectedCategory) return false
    if (selectedCondition && listing.condition !== selectedCondition) return false
    if (listing.price < priceRange[0] || listing.price > priceRange[1]) return false
    if (verifiedOnly && (listing.evidenceScore || 0) < 70) return false
    return true
  })

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-6">
      <ImageLightbox
        open={lightboxOpen}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        alt={lightboxAlt || 'Angebot'}
        onClose={() => setLightboxOpen(false)}
      />
      <MarketSoonBanner />
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-6 panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-semibold text-white leading-tight">Marktplatz</h1>
          <Link
            href="/market/new"
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            + Teil verkaufen
          </Link>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Suche</label>
          <input
            type="text"
            placeholder="Teile suchen..."
            className="input-base"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Nachweise</label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Nur bestaetigt (&gt;= 70%)
          </label>
        </div>

        {/* Make Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Marke</label>
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="select-base"
          >
            <option value="">Alle Marken</option>
            {makes.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Kategorie</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select-base"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Condition Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Zustand</label>
          <div className="flex flex-wrap gap-2">
            {conditions.map((cond) => (
              <button
                key={cond}
                onClick={() => setSelectedCondition(selectedCondition === cond ? '' : cond)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedCondition === cond
                    ? 'bg-sky-500 text-white'
                    : 'btn-secondary text-zinc-200'
                }`}
              >
                {conditionLabels[cond as keyof typeof conditionLabels]}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Preis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="input-base"
              placeholder="Min."
            />
            <span className="text-zinc-500">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="input-base"
              placeholder="Max."
            />
          </div>
        </div>

        {/* TÜV Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">TÜV Status</label>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input type="checkbox" className="checkbox-base" />
              TÜV OK (Eintragung)
            </label>
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input type="checkbox" className="checkbox-base" />
              ABE/E-Nummer
            </label>
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input type="checkbox" className="checkbox-base" />
              Nur Rennstrecke
            </label>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedMake || selectedCategory || selectedCondition) && (
          <button
            onClick={() => {
              setSelectedMake('')
              setSelectedCategory('')
              setSelectedCondition('')
              setPriceRange([0, 10000])
            }}
            className="w-full px-4 py-2 btn-secondary"
          >
            Filter zuruecksetzen
          </button>
        )}
      </aside>

      {/* Listings Grid */}
      <div className="flex-1 min-w-0">
        {/* Sort and Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400">
            {sortedListings.length} {sortedListings.length === 1 ? 'Angebot' : 'Angebote'} gefunden
          </p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/10 text-white text-sm"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="price_asc">Preis: aufsteigend</option>
            <option value="price_desc">Preis: absteigend</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-zinc-400 py-12">Lade Angebote...</div>
        ) : sortedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((listing) => (
              (() => {
                const thumb = listing.images?.[0] || listing.car?.heroImage || null
                return (
              <Link
                key={listing.id}
                href={`/market/${listing.id}`}
                className="group panel overflow-hidden transition-all hover:-translate-y-0.5 hover:border-white/20"
              >
                 <div className="aspect-[4/3] bg-zinc-900/50 flex items-center justify-center relative">
                   {thumb ? (
                    <div
                       className="group absolute inset-0 cursor-zoom-in border border-transparent hover:border-sky-400 transition-all hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_28px_rgba(56,189,248,0.18)] relative"
                      title="Bilder ansehen"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const imgs = (listing.images && listing.images.length > 0) ? listing.images : (listing.car?.heroImage ? [listing.car.heroImage] : [])
                        setLightboxImages(imgs || [])
                        setLightboxIndex(0)
                        setLightboxAlt(listing.title)
                        setLightboxOpen(true)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          const imgs = (listing.images && listing.images.length > 0) ? listing.images : (listing.car?.heroImage ? [listing.car.heroImage] : [])
                          setLightboxImages(imgs || [])
                          setLightboxIndex(0)
                          setLightboxAlt(listing.title)
                          setLightboxOpen(true)
                        }
                      }}
                    >
                      <img
                        src={thumb}
                        alt={listing.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                   ) : (
                     <span className="text-zinc-500">400×300</span>
                   )}
                   <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded text-white ${conditionColors[listing.condition]}`}>
                       {conditionLabels[listing.condition]}
                     </span>
                   </div>
                 </div>
                 <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors line-clamp-2">
                      {listing.title}
                    </h3>
                  </div>
                   {(listing.evidenceScore || 0) > 0 && (
                     <div
                       className={[
                         'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                         listing.evidenceTier === 'GOLD'
                           ? 'border-amber-500/45 bg-amber-500/15 text-amber-300'
                           : listing.evidenceTier === 'SILVER'
                             ? 'border-slate-300/25 bg-slate-200/10 text-slate-200'
                             : listing.evidenceTier === 'BRONZE'
                               ? 'border-orange-500/35 bg-orange-500/15 text-orange-300'
                               : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                       ].join(' ')}
                       title="Evidence Score"
                     >
                       Nachweis {Math.round(listing.evidenceScore || 0)}%
                     </div>
                   )}
                   <p className="text-2xl font-bold text-sky-500">€{listing.price.toLocaleString()}</p>
                   <div className="flex items-center gap-2 text-sm text-zinc-400">
                     <span>
                      {listing.car ? `${listing.car.make} ${listing.car.model}` : 'Kein Fahrzeug verknuepft'}
                     </span>
                     {listing.mileageOnCar && (
                       <span>• {listing.mileageOnCar.toLocaleString()} km</span>
                     )}
                   </div>
                   <div className="flex items-center justify-between pt-2">
                     <div className="flex items-center gap-1 text-zinc-500 text-sm">
                      <span>@{listing.seller.name || 'Verkaeufer'}</span>
                     </div>
                     {listing.modification?.tuvStatus && (
                       <TuvBadge status={listing.modification.tuvStatus} className="text-xs px-2 py-0.5" />
                     )}
                  </div>
                </div>
              </Link>
                )
              })()
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">Keine Angebote gefunden</h3>
            <p className="text-zinc-400 mb-4">
              Passe deine Filter an oder stelle das erste Teil ein.
            </p>
            <Link
              href="/market/new"
              className="inline-block px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors"
            >
              Teil verkaufen
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
