import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const protectedPaths = ['/garage', '/settings', '/cars', '/market/new', '/events/new']

export default async function middleware(req: NextRequest) {
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  const token = await getToken({ req })
  if (token) {
    return NextResponse.next()
  }

  const signInUrl = new URL('/auth/signin', req.url)
  signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/garage/:path*', '/settings/:path*', '/cars/:path*', '/market/new', '/events/new'],
}
