import { NextRequest } from 'next/server'
import { ok, serverError } from '@/lib/api'
import { requireCronSecret } from '@/lib/cron'
import { runOpenClawDedupe } from '@/lib/scheduled'

// POST /api/openclaw/integrity — de-duplication for external schedulers.
// Vercel Cron runs the same job daily as GET /api/cron/openclaw-dedupe (vercel.json).
export async function POST(req: NextRequest) {
  try {
    const denied = requireCronSecret(req)
    if (denied) return denied
    return ok(await runOpenClawDedupe())
  } catch (err) {
    console.error('[openclaw/integrity]', err)
    return serverError()
  }
}
