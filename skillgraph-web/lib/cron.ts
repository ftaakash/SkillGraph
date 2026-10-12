import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifies the `x-cron-secret` header for scheduled-job endpoints.
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

  const provided = req.headers.get('x-cron-secret') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
