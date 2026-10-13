import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const matches = (provided: string, expected: string) => {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Verifies a scheduled-job call. Accepts Vercel Cron's `Authorization: Bearer <CRON_SECRET>`
 * and the `x-cron-secret` header used by external schedulers.
 * Fails closed: if CRON_SECRET is not configured, every call is rejected —
 * including in development, since these jobs write to whatever DATABASE_URL points at.
 * Returns a 401 response to send back, or null when the caller is authorised.
 */
export function requireCronSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron] CRON_SECRET is not set — rejecting scheduled call')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = req.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const header = req.headers.get('x-cron-secret') ?? ''
  if (!matches(bearer, expected) && !matches(header, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
