import type { Session } from 'next-auth'

function parseCsv(input: string | undefined) {
  return String(input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdminSession(session: Session | null | undefined) {
  const userId = session?.user && 'id' in session.user ? String((session.user as any).id || '') : ''
  const email = session?.user && 'email' in session.user ? String((session.user as any).email || '') : ''

  const allowedIds = new Set(parseCsv(process.env.ADMIN_USER_IDS))
  const allowedEmails = new Set(parseCsv(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()))

  if (userId && allowedIds.has(userId)) return true
  if (email && allowedEmails.has(email.toLowerCase())) return true
  return false
}

