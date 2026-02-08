'use client'

import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'

export default function NavBar() {
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'
  const avatarUrl = session?.user?.image || null
  const displayName = session?.user?.name || null

  const initials = (() => {
    const name = (displayName || '').trim()
    if (!name) return 'U'
    const parts = name.split(/\s+/g).filter(Boolean)
    const first = parts[0]?.[0] || ''
    const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : '') || ''
    return (first + second).toUpperCase() || 'U'
  })()

  return (
    <nav className="border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-xl font-bold text-sky-500">
            DRIVETUNING
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/garage" className="text-zinc-300 hover:text-white">
              Garage
            </Link>
            <Link href="/market" className="text-zinc-300 hover:text-white">
              Marktplatz
            </Link>
            <Link href="/events" className="text-zinc-300 hover:text-white">
              Events
            </Link>
            <Link href="/settings" className="text-zinc-300 hover:text-white">
              Einstellungen
            </Link>
            {isAuthed ? (
              <Link href="/settings/messages" className="text-zinc-300 hover:text-white">
                Nachrichten
              </Link>
            ) : null}
            {isAuthed ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-zinc-300 hover:text-white"
              >
                Abmelden
              </button>
            ) : (
              <>
                <Link href="/auth/signin" className="text-zinc-300 hover:text-white">
                  Anmelden
                </Link>
                <Link href="/auth/signup" className="text-zinc-300 hover:text-white">
                  Registrieren
                </Link>
              </>
            )}
            {isAuthed ? (
              <Link
                href="/settings/profile"
                aria-label="Profil oeffnen"
                title={displayName ? `Profil: ${displayName}` : 'Profil'}
                className="ml-1 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900/50 text-xs font-semibold text-zinc-200 transition-all hover:border-sky-400 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_22px_rgba(56,189,248,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName || 'Profil'}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="select-none">{initials}</span>
                )}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
