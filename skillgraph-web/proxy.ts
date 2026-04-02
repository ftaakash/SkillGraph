// proxy.ts — Next.js 16 route protection (replaces middleware.ts)
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function proxy(req: NextRequest) {
  const session = await auth()
  const isLoggedIn = !!session?.user
  const role = session?.user?.role

  const { pathname } = req.nextUrl;

  const isPublic = pathname === '/' || ['/login', '/register', '/logout', '/api/auth'].some(p => pathname.startsWith(p));
  
  if (!isLoggedIn) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Guard faculty routes
  if (pathname.startsWith('/faculty') && role !== 'FACULTY') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Guard recruiter routes
  if (pathname.startsWith('/recruiter') && role !== 'RECRUITER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Guard student routes from other roles
  const studentRoutes = ['/sprint', '/market', '/openclaw', '/resume-builder', '/jobs', '/linkedin', '/benchmark'];
  if (studentRoutes.some(route => pathname.startsWith(route)) && role !== 'STUDENT') {
    const fallback = role ? `/${role.toLowerCase()}/dashboard` : '/dashboard';
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
