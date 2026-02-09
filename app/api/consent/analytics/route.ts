import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readJson } from '@/lib/validation'

const COOKIE = 'dt_analytics_consent'

const bodySchema = z.object({
  consent: z.enum(['granted', 'denied']),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid consent' }, { status: 400 })
  }
  const consent = parsed.data.consent

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, consent, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
