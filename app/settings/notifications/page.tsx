'use client'

import { useState } from 'react'
import Link from 'next/link'

const notificationTypes = [
  {
    id: 'events',
    title: 'Events',
    description: 'Neue Events, Erinnerungen und Updates',
  },
  {
    id: 'marketplace',
    title: 'Marktplatz',
    description: 'Nachrichten, Verkaeufe und neue Angebote',
  },
  {
    id: 'garage',
    title: 'Garage',
    description: 'TÜV-Erinnerungen und Service-Intervalle',
  },
  {
    id: 'social',
    title: 'Social',
    description: 'Follower, Likes und Kommentare',
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState({
    events: { email: true, push: true },
    marketplace: { email: true, push: true },
    garage: { email: true, push: false },
    social: { email: false, push: false },
  })

  function toggleNotification(type: string, channel: 'email' | 'push') {
    setNotifications((prev) => ({
      ...prev,
      [type]: {
        ...prev[type as keyof typeof prev],
        [channel]: !prev[type as keyof typeof prev][channel],
      },
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/settings" className="hover:text-white transition-colors">
          Einstellungen
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Benachrichtigungen</span>
      </nav>

      <div>
        <h1 className="text-3xl font-semibold text-white">Benachrichtigungen</h1>
        <p className="text-zinc-400 mt-1">Benachrichtigungseinstellungen verwalten</p>
      </div>

      <div className="space-y-4">
        {notificationTypes.map((type) => (
          <div
            key={type.id}
            className="panel p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">{type.title}</h3>
                <p className="text-sm text-zinc-400">{type.description}</p>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[type.id as keyof typeof notifications].email}
                  onChange={() => toggleNotification(type.id, 'email')}
                  className="w-5 h-5 rounded bg-zinc-900/60 border-white/10 text-sky-500 focus:ring-sky-400/35"
                />
                <div>
                  <p className="text-white font-medium">E-Mail</p>
                  <p className="text-xs text-zinc-400">Per E-Mail erhalten</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[type.id as keyof typeof notifications].push}
                  onChange={() => toggleNotification(type.id, 'push')}
                  className="w-5 h-5 rounded bg-zinc-900/60 border-white/10 text-sky-500 focus:ring-sky-400/35"
                />
                <div>
                  <p className="text-white font-medium">Push</p>
                  <p className="text-xs text-zinc-400">Browser-Benachrichtigungen</p>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          disabled
          title="Bald"
          className="px-6 py-2 bg-sky-500/50 text-white font-semibold rounded-lg transition-colors cursor-not-allowed"
        >
          Aenderungen speichern
        </button>
      </div>
    </div>
  )
}
