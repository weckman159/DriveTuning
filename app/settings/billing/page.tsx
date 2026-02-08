'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function BillingPage() {
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [connectAccount, setConnectAccount] = useState<{
    stripeAccountId: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
  } | null>(null)

  async function loadPayoutStatus() {
    try {
      const res = await fetch('/api/market/connect/account')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setConnectAccount(data.account || null)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadPayoutStatus()
  }, [])

  async function startOnboarding() {
    setPayoutLoading(true)
    setPayoutError(null)
    try {
      const res = await fetch('/api/market/connect/account', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Onboarding konnte nicht gestartet werden')
      const url = String(data.url || '')
      if (!url) throw new Error('Ungueltige Serverantwort')
      window.location.href = url
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen')
    } finally {
      setPayoutLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/settings" className="hover:text-white transition-colors">
          Einstellungen
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Abrechnung</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold text-white">Abrechnung</h1>
        <p className="text-zinc-400 mt-1">Zahlungen und Auszahlungen verwalten</p>
      </div>

      {/* Seller Payouts */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">Auszahlungen</h2>
          {connectAccount?.payoutsEnabled ? (
            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm font-medium rounded-full">
              Bereit
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-sm font-medium rounded-full">
              Setup erforderlich
            </span>
          )}
        </div>
        <p className="text-zinc-300 mb-4">
          Verbinde ein Stripe-Konto, um Auszahlungen fuer Marktplatz-Verkaeufe zu erhalten.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={startOnboarding}
            disabled={payoutLoading}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {payoutLoading ? 'Oeffne...' : connectAccount ? 'Setup fortsetzen' : 'Auszahlungen einrichten'}
          </button>
          <button
            onClick={loadPayoutStatus}
            disabled={payoutLoading}
            className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/60 text-white font-semibold rounded-lg transition-colors"
          >
            Aktualisieren
          </button>
        </div>
        {payoutError ? <p className="text-red-400 text-sm mt-3">{payoutError}</p> : null}
        {connectAccount ? (
          <div className="mt-4 text-sm text-zinc-400 space-y-1">
            <p>Stripe-Konto: {connectAccount.stripeAccountId}</p>
            <p>Details eingereicht: {String(connectAccount.detailsSubmitted)}</p>
            <p>Auszahlungen aktiv: {String(connectAccount.payoutsEnabled)}</p>
          </div>
        ) : null}
      </div>

      {/* Current Plan */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Aktueller Plan</h2>
          <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-sm font-medium rounded-full">
            Kostenlos
          </span>
        </div>
        <p className="text-zinc-300 mb-4">
          Du bist aktuell im kostenlosen Plan. Pro bietet unbegrenzte Autos, unbegrenzte Listings und Prioritaets-Support.
        </p>
        <button
          disabled
          title="Bald"
          className="px-6 py-2 bg-sky-500/50 text-white font-semibold rounded-lg transition-colors cursor-not-allowed"
        >
          Upgrade auf Pro
        </button>
      </div>

      {/* Payment Methods */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Zahlungsmethoden</h2>
          <button
            disabled
            title="Bald"
            className="px-4 py-2 bg-zinc-700/60 text-zinc-300 text-sm font-medium rounded-lg transition-colors cursor-not-allowed"
          >
            + Karte hinzufuegen
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">💳</div>
          <p className="text-zinc-400">Keine Zahlungsmethoden gespeichert</p>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <h2 className="text-xl font-bold text-white mb-4">Abrechnungsverlauf</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-zinc-400">Noch kein Abrechnungsverlauf</p>
        </div>
      </div>
    </div>
  )
}
