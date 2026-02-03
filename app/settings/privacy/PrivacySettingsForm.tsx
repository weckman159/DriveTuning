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
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
      {/* Hide Garage Location */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-white font-medium">Hide Garage Location</label>
          <p className="text-sm text-zinc-400">Don't show exact location of your garage</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, hideGarageLocation: !s.hideGarageLocation }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.hideGarageLocation ? 'bg-orange-500' : 'bg-zinc-600'
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
          <label className="block text-white font-medium">Auto Blur License Plates</label>
          <p className="text-sm text-zinc-400">Automatically blur license plates in photos</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, autoBlurPlates: !s.autoBlurPlates }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.autoBlurPlates ? 'bg-orange-500' : 'bg-zinc-600'
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
          <label className="block text-white font-medium">Show Real Name</label>
          <p className="text-sm text-zinc-400">Display your real name instead of username</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, showRealName: !s.showRealName }))}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.showRealName ? 'bg-orange-500' : 'bg-zinc-600'
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
        <label className="block text-white font-medium">Default Car Visibility</label>
        <div className="grid grid-cols-3 gap-3">
          {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map((visibility) => (
            <button
              key={visibility}
              type="button"
              onClick={() => setSettings(s => ({ ...s, defaultCarVisibility: visibility }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.defaultCarVisibility === visibility
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {visibility}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        {success && (
          <p className="text-green-400 text-sm text-center mt-2">Settings saved successfully</p>
        )}
      </div>
    </form>
  )
}
