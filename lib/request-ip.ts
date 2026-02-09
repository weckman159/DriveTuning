import 'server-only'

export function getRequestIp(req: Request): string | null {
  const xff = (req.headers.get('x-forwarded-for') || '').trim()
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  const xrip = (req.headers.get('x-real-ip') || '').trim()
  if (xrip) return xrip

  return null
}

