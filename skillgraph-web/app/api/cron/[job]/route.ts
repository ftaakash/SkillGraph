import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron'
import { logger } from '@/lib/log'
import {
  runBillingMaintenance,
  runSprintGenerator,
  runOpenClawNightly,
  runOpenClawDedupe,
  runMonthlyReports,
  runMarketRefresh,
} from '@/lib/scheduled'

// Vercel Hobby functions stop at 300 s; jobs stop starting new work 30 s before that
export const maxDuration = 300
export const dynamic = 'force-dynamic'
const BUDGET_MS = 270_000

const JOBS: Record<string, (deadline: number) => Promise<unknown>> = {
  billing: () => runBillingMaintenance(),
  sprints: deadline => runSprintGenerator(deadline),
  openclaw: deadline => runOpenClawNightly(deadline),
  'openclaw-dedupe': () => runOpenClawDedupe(),
  reports: deadline => runMonthlyReports(deadline),
  market: deadline => runMarketRefresh(deadline),
}

// GET /api/cron/:job — called by Vercel Cron (schedules in vercel.json) with Authorization: Bearer CRON_SECRET
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const denied = requireCronSecret(req)
  if (denied) return denied
  const { job } = await params
  const run = JOBS[job]
  if (!run) return NextResponse.json({ error: 'Unknown job' }, { status: 404 })

  const started = Date.now()
  try {
    const result = await run(started + BUDGET_MS)
    logger.info('cron.completed', { job, ms: Date.now() - started, result })
    return NextResponse.json({ job, ms: Date.now() - started, result })
  } catch (err) {
    logger.error('cron.failed', { job, err })
    return NextResponse.json({ job, error: 'Job failed' }, { status: 500 })
  }
}
