'use client'

import Link from 'next/link'

const connectedApps = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    description: 'Fahrdaten und Trackdays synchronisieren',
    icon: '⌚',
    connected: false,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Fahr-Playlists teilen',
    icon: '🎵',
    connected: false,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Builds auf Instagram teilen',
    icon: '📷',
    connected: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Videos verknuepfen',
    icon: '▶️',
    connected: false,
  },
]

export default function ConnectedAppsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/settings" className="hover:text-white transition-colors">
          Einstellungen
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Verknuepfte Apps</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold text-white">Verknuepfte Apps</h1>
        <p className="text-zinc-400 mt-1">Drittanbieter-Dienste verwalten, die mit deinem Konto verbunden sind</p>
      </div>

      <div className="space-y-4">
        {connectedApps.map((app) => (
          <div
            key={app.id}
            className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{app.icon}</div>
              <div>
                <h3 className="font-semibold text-white">{app.name}</h3>
                <p className="text-sm text-zinc-400">{app.description}</p>
              </div>
            </div>
            <button
              disabled
              title="Bald"
              className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
                app.connected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-zinc-700/60 text-zinc-300'
              }`}
            >
              {app.connected ? 'Trennen' : 'Verbinden'}
            </button>
          </div>
        ))}
      </div>

      {/* API Access */}
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
        <h2 className="text-xl font-bold text-white mb-4">API-Zugang</h2>
        <p className="text-zinc-300 mb-4">
          Nutze die DRIVETUNING API, um eigene Anwendungen zu integrieren.
        </p>
        <div className="flex gap-4">
          <button
            disabled
            title="Bald"
            className="px-4 py-2 bg-sky-500/50 text-white font-semibold rounded-lg transition-colors cursor-not-allowed"
          >
            API-Schluessel erzeugen
          </button>
          <button
            disabled
            title="Bald"
            className="px-4 py-2 bg-zinc-700/60 text-zinc-300 font-semibold rounded-lg transition-colors cursor-not-allowed"
          >
            Dokumentation ansehen
          </button>
        </div>
      </div>
    </div>
  )
}
