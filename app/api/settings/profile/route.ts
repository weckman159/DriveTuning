import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readJson } from '@/lib/validation'
import { consumeRateLimit } from '@/lib/rate-limit'
import { persistImage } from '@/lib/image-storage'

const reservedUsernames = new Set(
  [
    'admin',
    'api',
    'auth',
    'build',
    'cars',
    'chat',
    'docs',
    'events',
    'explore',
    'garage',
    'help',
    'legal',
    'learn',
    'market',
    'settings',
    'signin',
    'signup',
    'support',
  ].map((v) => v.toLowerCase())
)

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase()
}

function isValidUsername(value: string): boolean {
  // 3-24 chars; lowercase letters, numbers, _ and -
  // Must start/end with alphanumeric to avoid awkward handles.
  return /^[a-z0-9][a-z0-9_-]{1,22}[a-z0-9]$/.test(value)
}

function validateWebsite(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(250).optional().nullable(),
  location: z.string().trim().max(80).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  instagram: z.string().trim().max(60).optional().nullable(),
  twitter: z.string().trim().max(60).optional().nullable(),
  youtube: z.string().trim().max(120).optional().nullable(),
  username: z.string().trim().max(32).optional().nullable(),
  avatarDataUrl: z.string().trim().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profile: {
        select: {
          username: true,
          usernameChangedAt: true,
          bio: true,
          location: true,
          website: true,
          instagram: true,
          twitter: true,
          youtube: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  return NextResponse.json({
    user: { name: user.name, email: user.email, image: user.image },
    profile: user.profile,
  })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = await consumeRateLimit({
    namespace: 'settings:profile:update:user',
    identifier: session.user.id,
    limit: 30,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen in kurzer Zeit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  const parsed = patchSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungueltige Eingabe' }, { status: 400 })
  }

  const body = parsed.data

  const website = normalizeOptionalText(body.website)
  if (website && !validateWebsite(website)) {
    return NextResponse.json({ error: 'Website muss mit http(s) beginnen' }, { status: 400 })
  }

  const usernameRaw = body.username === undefined ? undefined : normalizeOptionalText(body.username)
  const username = typeof usernameRaw === 'string' ? normalizeUsername(usernameRaw) : usernameRaw
  if (typeof username === 'string') {
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Benutzername: 3–24 Zeichen (a-z, 0-9, _ , -), muss mit Buchstabe/Zahl beginnen und enden' },
        { status: 400 }
      )
    }
    if (reservedUsernames.has(username)) {
      return NextResponse.json({ error: 'Dieser Benutzername ist reserviert' }, { status: 400 })
    }
  }

  const avatarDataUrl = typeof body.avatarDataUrl === 'string' ? body.avatarDataUrl.trim() : ''
  if (avatarDataUrl) {
    const avatarRl = await consumeRateLimit({
      namespace: 'settings:profile:avatar:update:user',
      identifier: session.user.id,
      limit: 5,
      windowMs: 10 * 60_000,
    })
    if (!avatarRl.ok) {
      return NextResponse.json(
        { error: 'Zu viele Avatar-Uploads in kurzer Zeit' },
        { status: 429, headers: { 'Retry-After': String(avatarRl.retryAfterSeconds) } }
      )
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          profile: { select: { username: true, usernameChangedAt: true } },
        },
      })
      if (!existing) throw new Error('User not found')

      const userUpdate: { name?: string; image?: string } = {}
      if (typeof body.displayName === 'string') userUpdate.name = body.displayName.trim()

      if (avatarDataUrl) {
        const persistedUrl = await persistImage(avatarDataUrl, `avatars/${existing.id}`)
        userUpdate.image = persistedUrl
      }

      const profileUpdate: Record<string, unknown> = {
        ...(body.bio !== undefined ? { bio: normalizeOptionalText(body.bio) } : {}),
        ...(body.location !== undefined ? { location: normalizeOptionalText(body.location) } : {}),
        ...(body.website !== undefined ? { website } : {}),
        ...(body.instagram !== undefined ? { instagram: normalizeOptionalText(body.instagram) } : {}),
        ...(body.twitter !== undefined ? { twitter: normalizeOptionalText(body.twitter) } : {}),
        ...(body.youtube !== undefined ? { youtube: normalizeOptionalText(body.youtube) } : {}),
      }

      if (username !== undefined) {
        const current = existing.profile?.username ?? null
        const currentChangedAt = existing.profile?.usernameChangedAt ?? null

        if (current && username !== current) {
          // Enforce "can only be changed once": if a username is already set, it can't be changed/cleared.
          throw new Error('USERNAME_LOCKED')
        }

        if (typeof username === 'string' && username !== current) {
          const taken = await tx.userProfile.findFirst({
            where: { username, NOT: { userId: existing.id } },
            select: { userId: true },
          })
          if (taken) throw new Error('USERNAME_TAKEN')
        }

        const nextUsernameChangedAt =
          currentChangedAt ?? (typeof username === 'string' && username !== current ? new Date() : null)

        Object.assign(profileUpdate, {
          username,
          ...(nextUsernameChangedAt ? { usernameChangedAt: nextUsernameChangedAt } : {}),
        })
      }

      const [userRow, profileRow] = await Promise.all([
        Object.keys(userUpdate).length
          ? tx.user.update({
              where: { id: existing.id },
              data: userUpdate,
              select: { name: true, email: true, image: true },
            })
          : tx.user.findUniqueOrThrow({
              where: { id: existing.id },
              select: { name: true, email: true, image: true },
            }),
        Object.keys(profileUpdate).length
          ? tx.userProfile.upsert({
              where: { userId: existing.id },
              update: profileUpdate,
              create: { userId: existing.id, ...profileUpdate },
              select: {
                username: true,
                usernameChangedAt: true,
                bio: true,
                location: true,
                website: true,
                instagram: true,
                twitter: true,
                youtube: true,
              },
            })
          : tx.userProfile.findUnique({
              where: { userId: existing.id },
              select: {
                username: true,
                usernameChangedAt: true,
                bio: true,
                location: true,
                website: true,
                instagram: true,
                twitter: true,
                youtube: true,
              },
            }),
      ])

      return { user: userRow, profile: profileRow }
    })

    return NextResponse.json({ success: true, ...updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'USERNAME_TAKEN') {
      return NextResponse.json({ error: 'Benutzername ist bereits vergeben' }, { status: 409 })
    }
    if (msg === 'USERNAME_LOCKED') {
      return NextResponse.json(
        { error: 'Benutzername kann nur einmal gesetzt werden. Bitte kontaktiere den Support, falls du ihn aendern musst.' },
        { status: 400 }
      )
    }
    if (msg === 'User not found') {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })
    }
    console.error('[settings/profile] update error', err)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

