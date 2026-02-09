'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

type SaveMessage = { kind: 'success' | 'error'; text: string }

type ProfilePayload = {
  user: { name: string | null; email: string | null; image: string | null }
  profile: {
    username: string | null
    usernameChangedAt: string | null
    bio: string | null
    location: string | null
    website: string | null
    instagram: string | null
    twitter: string | null
    youtube: string | null
  } | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<SaveMessage | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [usernameLocked, setUsernameLocked] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    instagram: '',
    twitter: '',
    youtube: '',
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      displayName: session?.user?.name || prev.displayName,
      email: session?.user?.email || prev.email,
    }))
  }, [session?.user?.email, session?.user?.name])

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
    async function loadProfile() {
      setIsLoading(true)
      setMessage(null)
      try {
        const res = await fetch('/api/settings/profile', { method: 'GET' })
        if (!res.ok) return
        const data = (await res.json()) as ProfilePayload
        if (cancelled) return

        setAvatarUrl(data.user?.image ?? null)
        setUsernameLocked(Boolean(data.profile?.username && data.profile?.usernameChangedAt))
        setFormData((prev) => ({
          ...prev,
          displayName: data.user?.name ?? prev.displayName,
          email: data.user?.email ?? prev.email,
          username: data.profile?.username ?? prev.username,
          bio: data.profile?.bio ?? '',
          location: data.profile?.location ?? '',
          website: data.profile?.website ?? '',
          instagram: data.profile?.instagram ?? '',
          twitter: data.profile?.twitter ?? '',
          youtube: data.profile?.youtube ?? '',
        }))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [status])

  async function patchProfile(body: Record<string, unknown>) {
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      const errorText = typeof json?.error === 'string' ? json.error : 'Fehler beim Speichern'
      throw new Error(errorText)
    }

    return json as { user: { name: string | null; email: string | null; image: string | null }; profile: ProfilePayload['profile'] }
  }

  async function handleSaveProfile() {
    setIsSaving(true)
    setMessage(null)

    try {
      const updated = await patchProfile({
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        instagram: formData.instagram,
        twitter: formData.twitter,
        youtube: formData.youtube,
      })

      setAvatarUrl(updated.user.image ?? null)
      setMessage({ kind: 'success', text: 'Gespeichert' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetUsername() {
    setIsSaving(true)
    setMessage(null)

    try {
      const updated = await patchProfile({ username: formData.username })
      setFormData((prev) => ({
        ...prev,
        username: updated.profile?.username ?? prev.username,
      }))
      setUsernameLocked(Boolean(updated.profile?.username && updated.profile?.usernameChangedAt))
      setMessage({ kind: 'success', text: 'Benutzername gespeichert' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAvatarFile(file: File) {
    if (!file) return
    setMessage(null)

    const maxBytes = 2 * 1024 * 1024
    if (file.size > maxBytes) {
      setMessage({ kind: 'error', text: 'Bild zu gross (max. 2MB)' })
      return
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!allowed.has(file.type)) {
      setMessage({ kind: 'error', text: 'Nur JPG/PNG/WebP/GIF erlaubt' })
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(file)
    })

    setIsUploadingAvatar(true)
    try {
      const updated = await patchProfile({ avatarDataUrl: dataUrl })
      setAvatarUrl(updated.user.image ?? null)
      setMessage({ kind: 'success', text: 'Avatar aktualisiert' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Avatar-Upload fehlgeschlagen' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

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
          <div className="w-24 h-24 bg-sky-500 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (formData.displayName[0] || 'U').toUpperCase()
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void handleAvatarFile(file)
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar || isLoading}
              className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-300 font-semibold rounded-lg transition-colors mb-2 disabled:opacity-60"
            >
              {isUploadingAvatar ? 'Lade hoch…' : 'Foto hochladen'}
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
            <label className="block text-sm font-medium text-zinc-300 mb-1">Anzeigename</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="input-base"
            />
            <p className="text-xs text-zinc-500 mt-1">Email kann aktuell nicht im Profil geaendert werden.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="textarea-base resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Standort</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="input-base"
            />
          </div>
        </div>

        {message && (
          <div
            className={`text-sm rounded-lg px-3 py-2 ${
              message.kind === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end pt-4 items-center gap-3">
          {isLoading && <span className="text-xs text-zinc-500">Lade Profildaten…</span>}
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {isSaving ? 'Speichere…' : 'Aenderungen speichern'}
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
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            readOnly={usernameLocked}
            className="flex-1 input-base"
          />
          <button
            type="button"
            onClick={handleSetUsername}
            disabled={isSaving || isLoading || usernameLocked || !formData.username.trim()}
            className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-300 font-semibold rounded-lg transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {usernameLocked ? 'Gesperrt' : 'Benutzername speichern'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Dein eindeutiger Name auf DRIVETUNING. Kann nur einmal gesetzt werden.
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
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="flex-1 input-base"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-10 text-xl">🐦</span>
            <input
              type="text"
              placeholder="X/Twitter Handle"
              value={formData.twitter}
              onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
              className="flex-1 input-base"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-10 text-xl">▶️</span>
            <input
              type="text"
              placeholder="YouTube Kanal"
              value={formData.youtube}
              onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
              className="flex-1 input-base"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {isSaving ? 'Speichere…' : 'Aenderungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
