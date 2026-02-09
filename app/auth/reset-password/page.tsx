'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Reset-Token fehlt.')
      return
    }

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwoerter stimmen nicht ueberein.')
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Zuruecksetzen fehlgeschlagen.')
      }

      setStatus('done')
      router.push('/auth/signin?reset=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="panel p-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Passwort zuruecksetzen</h1>
          <p className="text-zinc-400 mb-6">
            Lege ein neues Passwort fuer dein Konto fest.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {!token && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
              Dieser Reset-Link enthaelt keinen Token. Bitte fordere einen neuen an.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Neues Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input-base"
                placeholder="********"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Passwort bestaetigen
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-base"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !token}
              className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              {status === 'loading' ? 'Setze zurueck...' : 'Passwort zuruecksetzen'}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400 text-sm">
            <Link href="/auth/signin" className="text-sky-400 hover:text-sky-300">
              Zurueck zum Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
