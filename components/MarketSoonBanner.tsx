'use client'

export default function MarketSoonBanner() {
  const commerceEnabled = (process.env.NEXT_PUBLIC_MARKET_COMMERCE_ENABLED || '').trim() === 'true'
  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
            BALD
          </span>
          <p className="text-sm text-amber-200">
            {commerceEnabled
              ? 'Versand und Kaeuferschutz kommen bald. Listings, Chat, Angebote und Zahlung funktionieren bereits.'
              : 'Zahlung, Versand und Kaeuferschutz kommen bald. Listings, Chat und Angebote funktionieren bereits.'}
          </p>
        </div>
        <p className="text-xs text-amber-200/80">Beta</p>
      </div>
    </div>
  )
}
