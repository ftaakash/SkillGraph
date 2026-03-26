// proxy.ts — Next.js 16 route protection (replaces middleware.ts)
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function proxy(req: NextRequest) {
  const session = await auth()
  const isLoggedIn = !!session?.user

  const protectedPaths = ['/dashboard', '/sprint', '/onboard', '/benchmark', '/linkedin', '/profile']
  const isProtected = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sprint/:path*',
    '/onboard/:path*',
    '/benchmark/:path*',
    '/linkedin/:path*',
    '/profile/:path*',
  ],
}
