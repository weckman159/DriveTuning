'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    website: '',
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      displayName: session?.user?.name || prev.displayName,
      email: session?.user?.email || prev.email,
    }))
  }, [session?.user?.email, session?.user?.name])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400">
        <Link href="/settings" className="hover:text-white transition-colors">
          Einstellungen
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Profil</span>
      </nav>

      <div>
        <h1 className="text-3xl font-semibold text-white">Profil</h1>
        <p className="text-zinc-400 mt-1">Dein oeffentliches Profil verwalten</p>
      </div>

      {/* Avatar */}
      <div className="panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-sky-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {(formData.displayName[0] || 'U').toUpperCase()}
          </div>
          <div>
          <button
            disabled
            title="Bald"
            className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-300 font-semibold rounded-lg transition-colors mb-2 cursor-not-allowed"
          >
            Foto hochladen
          </button>
            <p className="text-xs text-zinc-500">JPG, PNG oder GIF. Max. 2MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Profilinformationen</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Anzeigename
              </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Email
              </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-base"
            />
          </div>
          <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Bio
              </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="textarea-base resize-none"
            />
          </div>
          <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Standort
              </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Website
              </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="input-base"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            disabled
            title="Bald"
            className="px-6 py-2 bg-sky-500/50 text-white font-semibold rounded-lg transition-colors cursor-not-allowed"
          >
            Aenderungen speichern
          </button>
        </div>
      </div>

      {/* Username */}
      <div className="panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Benutzername</h2>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">@</span>
          <input
            type="text"
            defaultValue="m-power-lab"
            className="flex-1 input-base"
          />
          <button
            disabled
            title="Bald"
            className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-300 font-semibold rounded-lg transition-colors cursor-not-allowed"
          >
            Benutzername aendern
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Dein eindeutiger Name auf DRIVETUNING. Kann nur einmal geaendert werden.
        </p>
      </div>

      {/* Social Links */}
      <div className="panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Social Links</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="w-10 text-xl">📸</span>
            <input
              type="text"
              placeholder="Instagram Benutzername"
              className="flex-1 input-base"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-10 text-xl">🐦</span>
            <input
              type="text"
              placeholder="X/Twitter Handle"
              className="flex-1 input-base"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-10 text-xl">▶️</span>
            <input
              type="text"
              placeholder="YouTube Kanal"
              className="flex-1 input-base"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
