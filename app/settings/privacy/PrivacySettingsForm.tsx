'use client'

import { useState } from 'react'

interface Settings {
  hideGarageLocation: boolean
  autoBlurPlates: boolean
  showRealName: boolean
  defaultCarVisibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
}

interface Props {
  initialSettings: Settings
}

export default function PrivacySettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const visibilityLabel: Record<Settings['defaultCarVisibility'], string> = {
    PUBLIC: 'Oeffentlich',
    UNLISTED: 'Nicht gelistet',
    PRIVATE: 'Privat',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/settings/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 panel">
      {/* Hide Garage Location */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-white font-medium">Garagenstandort verbergen</label>
          <p className="text-sm text-zinc-400">Den genauen Standort deiner Garage nicht anzeigen</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, hideGarageLocation: !s.hideGarageLocation }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.hideGarageLocation ? 'bg-sky-500' : 'bg-white/10 border border-white/10'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.hideGarageLocation ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Auto Blur Plates */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-white font-medium">Kennzeichen automatisch verwischen</label>
          <p className="text-sm text-zinc-400">Kennzeichen auf Fotos automatisch unkenntlich machen</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, autoBlurPlates: !s.autoBlurPlates }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.autoBlurPlates ? 'bg-sky-500' : 'bg-white/10 border border-white/10'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.autoBlurPlates ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Show Real Name */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-white font-medium">Klarname anzeigen</label>
          <p className="text-sm text-zinc-400">Deinen echten Namen statt Benutzername anzeigen</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, showRealName: !s.showRealName }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.showRealName ? 'bg-sky-500' : 'bg-white/10 border border-white/10'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.showRealName ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Default Car Visibility */}
      <div className="space-y-3">
        <label className="block text-white font-medium">Standard-Sichtbarkeit fuer Autos</label>
        <div className="grid grid-cols-3 gap-3">
          {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map((visibility) => (
            <button
              key={visibility}
              type="button"
              onClick={() => setSettings(s => ({ ...s, defaultCarVisibility: visibility }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.defaultCarVisibility === visibility
                  ? 'bg-sky-500 text-white'
                  : 'btn-secondary text-zinc-200'
              }`}
            >
              {visibilityLabel[visibility]}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Speichere...' : 'Einstellungen speichern'}
        </button>
        {success && (
          <p className="text-green-400 text-sm text-center mt-2">Einstellungen erfolgreich gespeichert</p>
        )}
      </div>
    </form>
  )
}

