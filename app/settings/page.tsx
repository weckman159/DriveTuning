'use client'

import Link from 'next/link'

const settingsSections = [
  {
    title: 'Konto',
    description: 'Kontoeinstellungen verwalten',
    href: '/settings/profile',
    icon: '👤',
  },
  {
    title: 'Datenschutz',
    description: 'Daten und Privatsphaere steuern',
    href: '/settings/privacy',
    icon: '🔒',
  },
  {
    title: 'TUEV Guide',
    description: 'Checkliste fuer Abnahme/Eintragung',
    href: '/settings/legality-guide',
    icon: '📚',
  },
  {
    title: 'Legality Check',
    description: 'Schnellpruefung fuer Teile (mobilfreundlich)',
    href: '/mobile/legality-check',
    icon: '🛡️',
  },
  {
    title: 'Benachrichtigungen',
    description: 'Benachrichtigungen konfigurieren',
    href: '/settings/notifications',
    icon: '🔔',
  },
  {
    title: 'Abrechnung',
    description: 'Zahlungen und Auszahlungen verwalten',
    href: '/settings/billing',
    icon: '💳',
  },
  {
    title: 'Garagen',
    description: 'Garagen verwalten',
    href: '/garage',
    icon: '🏠',
  },
  {
    title: 'Marktplatz',
    description: 'Angebote und Kaeufe verwalten',
    href: '/market',
    icon: '🚗',
  },
  {
    title: 'Events',
    description: 'Event-Anmeldungen verwalten',
    href: '/events',
    icon: '🏁',
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Einstellungen</h1>
        <p className="text-zinc-400 mt-1">Konto und Praeferenzen verwalten</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{section.icon}</div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {section.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4">Gefahrenzone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Daten exportieren</p>
              <p className="text-sm text-zinc-400">
                Eine Kopie deiner Daten herunterladen
              </p>
            </div>
            <button
              disabled
              title="Bald"
              className="px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors cursor-not-allowed"
            >
              Exportieren
            </button>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
            <div>
              <p className="font-medium text-white">Konto loeschen</p>
              <p className="text-sm text-zinc-400">
                Konto und alle Daten dauerhaft loeschen
              </p>
            </div>
            <button
              disabled
              title="Bald"
              className="px-4 py-2 bg-red-500/60 text-white font-medium rounded-lg transition-colors cursor-not-allowed"
            >
              Loeschen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
