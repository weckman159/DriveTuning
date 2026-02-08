'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devLink, setDevLink] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDevLink(null)
    setStatus('loading')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => ({}))
      if (data?.resetLink) setDevLink(data.resetLink)

      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-zinc-800 rounded-xl p-8 border border-zinc-700">
          <h1 className="text-2xl font-bold text-white mb-2">Passwort vergessen</h1>
          <p className="text-zinc-400 mb-6">
            Wenn ein Konto existiert, senden wir dir einen Reset-Link per E-Mail.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {status === 'sent' ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                Wenn ein Konto zu dieser E-Mail existiert, wurde ein Reset-Link gesendet.
              </div>

              {devLink && (
                <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm break-words">
                  <div className="text-zinc-400 mb-1">Dev-Reset-Link:</div>
                  <a className="text-sky-400 hover:text-sky-300" href={devLink}>
                    {devLink}
                  </a>
                </div>
              )}

              <Link href="/auth/signin" className="text-sky-400 hover:text-sky-300 text-sm">
                Zurueck zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Sende...' : 'Reset-Link senden'}
              </button>

              <p className="text-center text-zinc-400 text-sm">
                <Link href="/auth/signin" className="text-sky-400 hover:text-sky-300">
                  Zurueck zum Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
