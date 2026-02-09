'use client'

import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

function NavItem(props: { href: string; label: string; icon: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Link
      href={props.href}
      onClick={props.onClick}
      className={props.className ?? 'inline-flex items-center gap-2 text-zinc-300 hover:text-white'}
    >
      <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-zinc-400">
        {props.icon}
      </span>
      <span className="text-sm font-medium">{props.label}</span>
    </Link>
  )
}

function NavAction(props: { onClick: () => void; label: string; icon: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={props.className ?? 'inline-flex items-center gap-2 text-zinc-300 hover:text-white'}
    >
      <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-zinc-400">
        {props.icon}
      </span>
      <span className="text-sm font-medium">{props.label}</span>
    </button>
  )
}

const icons = {
  garage: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5" />
      <path d="M5 13h14" />
      <path d="M6 13v6" />
      <path d="M18 13v6" />
      <path d="M7.5 19h9" />
      <path d="M7 10h.01" />
      <path d="M17 10h.01" />
    </svg>
  ),
  market: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  events: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 9h8" />
      <path d="M8 13h6" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ),
} as const

export default function NavBar() {
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'
  const avatarUrl = session?.user?.image || null
  const displayName = session?.user?.name || null
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const initials = (() => {
    const name = (displayName || '').trim()
    if (!name) return 'U'
    const parts = name.split(/\s+/g).filter(Boolean)
    const first = parts[0]?.[0] || ''
    const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : '') || ''
    return (first + second).toUpperCase() || 'U'
  })()

  return (
    <nav className="border-b border-white/10 bg-zinc-950/60 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="text-xl font-bold text-sky-500 whitespace-nowrap">
            DRIVETUNING
          </Link>

          <div className="hidden sm:flex items-center gap-4">
            <NavItem href="/garage" label="Garage" icon={icons.garage} />
            <NavItem href="/market" label="Marktplatz" icon={icons.market} />
            <NavItem href="/events" label="Events" icon={icons.events} />
            <NavItem href="/settings" label="Einstellungen" icon={icons.settings} />
            {isAuthed ? <NavItem href="/settings/messages" label="Nachrichten" icon={icons.messages} /> : null}
            {isAuthed ? (
              <NavAction onClick={() => signOut({ callbackUrl: '/' })} label="Abmelden" icon={icons.logout} />
            ) : (
              <>
                <NavItem href="/auth/signin" label="Anmelden" icon={icons.login} />
                <NavItem href="/auth/signup" label="Registrieren" icon={icons.register} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAuthed ? (
              <Link
                href="/settings/profile"
                aria-label="Profil oeffnen"
                title={displayName ? `Profil: ${displayName}` : 'Profil'}
                className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-200 transition-all hover:border-sky-400 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.65),0_0_22px_rgba(56,189,248,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
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

            <button
              type="button"
              className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              aria-label={mobileOpen ? 'Menue schliessen' : 'Menue oeffnen'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? icons.close : icons.menu}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="mobile-nav" className="sm:hidden pb-4">
            <div className="panel p-2">
              <NavItem
                href="/garage"
                label="Garage"
                icon={icons.garage}
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
              />
              <NavItem
                href="/market"
                label="Marktplatz"
                icon={icons.market}
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
              />
              <NavItem
                href="/events"
                label="Events"
                icon={icons.events}
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
              />
              <NavItem
                href="/settings"
                label="Einstellungen"
                icon={icons.settings}
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
              />
              {isAuthed ? (
                <NavItem
                  href="/settings/messages"
                  label="Nachrichten"
                  icon={icons.messages}
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
                />
              ) : null}

              <div className="mt-2 border-t border-white/10 pt-2">
                {isAuthed ? (
                  <NavAction
                    onClick={() => {
                      setMobileOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    label="Abmelden"
                    icon={icons.logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
                  />
                ) : (
                  <>
                    <NavItem
                      href="/auth/signin"
                      label="Anmelden"
                      icon={icons.login}
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
                    />
                    <NavItem
                      href="/auth/signup"
                      label="Registrieren"
                      icon={icons.register}
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-200 hover:bg-white/5"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
