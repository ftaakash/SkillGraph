// proxy.ts — Next.js 16 route protection (replaces middleware.ts)
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, clientIp } from '@/lib/rateLimit'

const PUBLIC_PREFIXES = [
  '/login', '/register', '/logout', '/forgot-password', '/reset-password', '/verify-email', '/privacy', '/terms',
  '/api/auth', '/api/health', '/api/stats',
  // Cron target — authenticates via x-cron-secret, not a session
  '/api/openclaw/integrity',
  // Payment provider callbacks — authenticated by HMAC signature, not a session
  '/api/billing/webhook',
  // OpenClaw browser extension — authenticated by its bearer token (lib/extension.ts)
  '/api/extension/me', '/api/extension/prepare', '/api/extension/applied',
]

const REQUEST_ID = /^[\w-]{8,64}$/

/** Rate-limit key for extension calls: a hash of the bearer token, so students sharing a campus IP don't share a limit. */
async function extensionClientKey(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') ?? ''
  if (!req.nextUrl.pathname.startsWith('/api/extension/') || !header.startsWith('Bearer ')) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(header.slice(7)))
  return 'ext:' + Array.from(new Uint8Array(digest).slice(0, 16), b => b.toString(16).padStart(2, '0')).join('')
}

export default async function proxy(req: NextRequest) {
  // Correlates a request across logs and error reports; returned to the client as x-request-id
  const incoming = req.headers.get('x-request-id')
  const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID()
  const tag = <T extends NextResponse>(res: T) => {
    res.headers.set('x-request-id', requestId)
    return res
  }
  const next = () => {
    const headers = new Headers(req.headers)
    headers.set('x-request-id', requestId)
    return tag(NextResponse.next({ request: { headers } }))
  }

  const session = await auth()
  const isLoggedIn = !!session?.user
  const role = session?.user?.role

  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/')

  if (isApi) {
    const clientKey = session?.user?.id ?? (await extensionClientKey(req)) ?? `ip:${clientIp(req.headers)}`
    const limit = await checkRateLimit(req.method, pathname, clientKey)
    if (limit.limited) {
      return tag(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      ))
    }
  }

  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))

  if (!isLoggedIn) {
    if (isPublic) return next();
    // APIs answer 401 JSON; pages redirect to sign-in
    if (isApi) return tag(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return tag(NextResponse.redirect(loginUrl))
  }

  // Guard faculty routes
  if (pathname.startsWith('/faculty') && role !== 'FACULTY') {
    return tag(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  // Guard recruiter routes
  if (pathname.startsWith('/recruiter') && role !== 'RECRUITER') {
    return tag(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  // Guard student routes from other roles
  const studentRoutes = [
    '/dashboard', '/academics', '/tracker', '/participation',
    '/sprint', '/market', '/openclaw', '/resume-builder', '/jobs', '/linkedin', '/benchmark',
  ];
  // Signed-out visitors are sent to /login by the (app) layout; only redirect other roles here
  if (role && role !== 'STUDENT' && studentRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    const fallback = role ? `/${role.toLowerCase()}/dashboard` : '/dashboard';
    return tag(NextResponse.redirect(new URL(fallback, req.url)));
  }

  return next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
