# DRIVETUNING - Clerk Auth Migration Guide

## Overview

This guide covers migrating from NextAuth.js to Clerk for authentication. Clerk provides a more robust, production-ready solution with better UX and fewer configuration headaches.

## Table of Contents

1. [Clerk Setup](#1-clerk-setup)
2. [Install Dependencies](#2-install-dependencies)
3. [Replace NextAuth with Clerk](#3-replace-nextauth-with-clerk)
4. [Update Components](#4-update-components)
5. [Update UserPrivacySettings Flow](#5-update-userprivacysettings-flow)
6. [Migration Script](#6-migration-script)
7. [Rollback Plan](#7-rollback-plan)

---

## 1. Clerk Setup

### 1.1 Create Clerk Account
1. Go to: https://clerk.com
2. Sign up with GitHub or email
3. Create new application: `drivetuning`

### 1.2 Configure Providers
In Clerk Dashboard → **Authentication** → **Social Providers**:

- **Google**: Enable and configure with OAuth credentials
- **Email**: Enable (for magic links)

### 1.3 Get API Keys
Go to **API Keys** section:
- Copy `Publishable Key`
- Copy `Secret Key`

---

## 2. Install Dependencies

```bash
# Remove NextAuth
npm uninstall next-auth @auth/prisma-adapter

# Install Clerk
npm installnextjs
 @clerk/```

### Update `package.json` scripts:
```json
{
  "postinstall": "prisma generate"
}
```

---

## 3. Replace NextAuth with Clerk

### 3.1 Create Clerk Middleware

Create `middleware.ts` in project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/garage(.*)',
  '/market(.*)',
  '/events(.*)',
  '/settings(.*)',
  '/api/cars(.*)',
  '/api/market(.*)',
  '/api/events(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### 3.2 Create Clerk Provider Wrapper

Create `components/AuthProvider.tsx`:

```typescript
'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: 'bg-sky-500 hover:bg-sky-400',
          footerActionLink: 'text-sky-500 hover:text-sky-400',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
```

### 3.3 Update Root Layout

Update `app/layout.tsx`:

```typescript
import { AuthProvider } from '@/components/AuthProvider'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-zinc-900 text-zinc-100 min-h-screen">
          <AuthProvider>
            <nav className="border-b border-zinc-800">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16 items-center">
                  <a href="/" className="text-xl font-bold text-sky-500">
                    DRIVETUNING
                  </a>
                  <div className="flex items-center space-x-4">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 py-8">
              {children}
            </main>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

---

## 4. Update Components

### 4.1 Replace SignIn/SignUp

Create `components/SignIn.tsx`:

```typescript
'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <SignIn
        afterSignInUrl="/garage"
        afterSignUpUrl="/settings/privacy"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-zinc-800 border border-zinc-700',
          },
        }}
      />
    </div>
  )
}
```

### 4.2 Add UserButton with Menu

Create `components/UserMenu.tsx`:

```typescript
'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function UserMenu() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()

  if (!isLoaded) return null

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg"
      >
        Sign In
      </Link>
    )
  }

  const navLinks = [
    { href: '/garage', label: 'Garage' },
    { href: '/market', label: 'Market' },
    { href: '/events', label: 'Events' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <div className="flex items-center gap-4">
      {/* Navigation */}
      <div className="hidden md:flex items-center gap-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm ${
              pathname === link.href ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Menu */}
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8',
          },
        }}
      />
    </div>
  )
}
```

---

## 5. Update UserPrivacySettings Flow

### 5.1 New User Registration Handler

Create `app/api/auth/clerk-webhook/route.ts`:

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

type WebhookEvent = {
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
  }
  object: 'event'
  type: 'user.created'
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    return new Response('Missing webhook secret', { status: 500 })
  }

  // Get headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Webhook verification failed', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    // Create user in our database
    await prisma.user.create({
      data: {
        id,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        email: email_addresses[0]?.email_address || null,
        image: image_url || null,
      },
    })

    // Create default privacy settings
    await prisma.userPrivacySettings.create({
      data: {
        userId: id,
        hideGarageLocation: true,
        autoBlurPlates: true,
        showRealName: false,
        defaultCarVisibility: 'UNLISTED',
      },
    })

    // Create default garage
    const garage = await prisma.garage.create({
      data: {
        userId: id,
        name: 'My Garage',
        region: 'Unknown',
        isDefault: true,
      },
    })

    console.log(`✅ Created user ${id} with garage ${garage.id}`)
  }

  return new Response('', { status: 200 })
}
```

### 5.2 Update Privacy Settings Page

Update `app/settings/privacy/page.tsx`:

```typescript
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PrivacySettingsForm from './PrivacySettingsForm'

async function getSettings(userId: string) {
  const settings = await prisma.userPrivacySettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    return {
      hideGarageLocation: true,
      autoBlurPlates: true,
      showRealName: false,
      defaultCarVisibility: 'UNLISTED' as const,
    }
  }

  return settings
}

export default async function PrivacyPage() {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()
  const settings = await getSettings(userId)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        {user?.imageUrl && (
          <img src={user.imageUrl} alt="" className="w-16 h-16 rounded-full" />
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">Privacy Settings</h1>
          <p className="text-zinc-400">
            Signed in as {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>

      <PrivacySettingsForm initialSettings={settings} userId={userId} />
    </div>
  )
}
```

---

## 6. Migration Script

Create `prisma/migrate-from-nextauth.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateUsers() {
  console.log('🔄 Starting NextAuth → Clerk migration...')

  // Get all NextAuth users
  const nextAuthUsers = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true,
    },
  })

  console.log(`� Found ${nextAuthUsers.length} users to migrate`)

  let migrated = 0
  let skipped = 0

  for (const user of nextAuthUsers) {
    // Check if already has Clerk ID (starts with 'usr_')
    if (user.id.startsWith('usr_')) {
      console.log(`⏭️  Skipping ${user.email} - already migrated`)
      skipped++
      continue
    }

    // Get Clerk user ID from accounts
    const clerkAccount = user.accounts.find(
      (a) => a.provider === 'clerk' || a.provider === 'google'
    )

    if (!clerkAccount) {
      console.log(`⚠️  No Clerk account for ${user.email}, skipping`)
      skipped++
      continue
    }

    // Update user with Clerk ID
    const newId = `usr_${clerkAccount.providerAccountId}`

    await prisma.user.update({
      where: { id: user.id },
      data: { id: newId },
    })

    // Update all related records
    await prisma.account.updateMany({
      where: { userId: user.id },
      data: { userId: newId },
    })

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { userId: newId },
    })

    await prisma.garage.updateMany({
      where: { userId: user.id },
      data: { userId: newId },
    })

    await prisma.userPrivacySettings.update({
      where: { userId: user.id },
      data: { userId: newId },
    })

    console.log(`✅ Migrated ${user.email} → ${newId}`)
    migrated++
  }

  console.log('\n📊 Migration Summary:')
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log('\n🎉 Migration complete!')

  // Delete old users
  const oldUsers = await prisma.user.findMany({
    where: { NOT: { id: { startsWith: 'usr_' } } },
  })

  if (oldUsers.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: oldUsers.map((u) => u.id) } },
    })
    console.log(`🗑️  Deleted ${oldUsers.length} orphaned users`)
  }
}

migrateUsers()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Run migration:

```bash
npx tsx prisma/migrate-from-nextauth.ts
```

---

## 7. Rollback Plan

### If Clerk has issues, restore NextAuth:

```bash
# Reinstall NextAuth
npm uninstall @clerk/nextjs
npm install next-auth @auth/prisma-adapter

# Restore auth.ts
# Update lib/auth.ts back to NextAuth config

# Remove middleware.ts or update to allow all routes
```

### Keep Both (Recommended During Transition)

1. Deploy Clerk alongside NextAuth
2. Test with small user group
3. Redirect new signups to Clerk
4. Migrate existing users gradually
5. Disable NextAuth after full migration

---

## Environment Variables

Update `.env`:

```env
# Remove
NEXTAUTH_SECRET
NEXTAUTH_URL

# Add Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Keep Database
DATABASE_URL="..."
```

Add to Vercel:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Public)
- `CLERK_SECRET_KEY` (Private)
- `CLERK_WEBHOOK_SECRET` (Private)

---

## Testing Checklist

- [ ] Sign in with Google works
- [ ] Sign in with email works
- [ ] Protected routes redirect to sign-in
- [ ] User menu shows correct avatar
- [ ] Sign out redirects correctly
- [ ] New user gets default garage
- [ ] Privacy settings created on first login
- [ ] Webhook creates user in database
- [ ] Existing users can still sign in

---

## Support

- Clerk Docs: https://clerk.com/docs
- Clerk Discord: https://clerk.com/discord
- Clerk Support: support@clerk.com

