/**
 * Optional long-running worker (ADR-001), for hosting the scheduled jobs outside Vercel.
 * In production the same jobs run on Vercel Cron (vercel.json → app/api/cron/[job]); run this
 * only if you host the jobs elsewhere instead — never both, or each job runs twice.
 *
 * Run with:  npm run worker      (tsx resolves the project's "@/..." path aliases). Needs REDIS_URL.
 */
import dotenv from 'dotenv'
// Load .env then override with .env.local (no-ops in containers that inject env vars)
dotenv.config({ path: '.env', quiet: true })
dotenv.config({ path: '.env.local', override: true, quiet: true })

import http from 'http'
import Queue from 'bull'
import { prisma } from '../lib/prisma'
import {
  NO_DEADLINE,
  runBillingMaintenance,
  runSprintGenerator,
  runOpenClawNightly,
  runOpenClawDedupe,
  runMonthlyReports,
  runMarketRefresh,
} from '../lib/scheduled'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL is required to run the worker.')
  process.exit(1)
}

// rediss:// enables TLS with certificate verification (ioredis default); never disable verification
const bullOpts: Queue.QueueOptions = {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false },
}

// Same jobs and times as vercel.json; no deadline here, since a worker process has no time limit
const JOBS: { name: string; cron: string; run: () => Promise<unknown> }[] = [
  { name: 'market', cron: '0 20 * * *', run: () => runMarketRefresh(NO_DEADLINE) },        // 01:30 IST
  { name: 'billing', cron: '30 0 * * *', run: () => runBillingMaintenance() },              // 06:00 IST
  { name: 'openclaw', cron: '0 1 * * *', run: () => runOpenClawNightly(NO_DEADLINE) },      // 06:30 IST
  { name: 'sprints', cron: '*/5 * * * *', run: () => runSprintGenerator(NO_DEADLINE) },     // every 5 minutes
  { name: 'openclaw-dedupe', cron: '0 3 * * *', run: () => runOpenClawDedupe() },           // 08:30 IST
  { name: 'reports', cron: '30 2 1 * *', run: () => runMonthlyReports(NO_DEADLINE) },       // 1st of month 08:00 IST
]

const queues = JOBS.map(job => {
  const queue = new Queue(job.name, redisUrl, bullOpts)
  queue.process(async () => {
    const result = await job.run()
    console.log(`[${job.name}]`, JSON.stringify(result))
  })
  queue.on('failed', (j, err) => console.error(`[${job.name}] job ${j.id} failed:`, err.message))
  return { job, queue }
})

async function scheduleJobs() {
  for (const { job, queue } of queues) {
    // Remove stale repeatable schedules so cron changes take effect on deploy
    for (const r of await queue.getRepeatableJobs()) await queue.removeRepeatableByKey(r.key)
    await queue.add({}, { repeat: { cron: job.cron } })
  }
  // Optional immediate market-data refresh (uses paid API quota)
  if (process.env.RUN_SCRAPER_ON_START === 'true') await queues.find(q => q.job.name === 'market')!.queue.add({})
  console.log(`✅ SkillGraph worker started: ${JOBS.map(j => j.name).join(', ')}`)
}

// ── Health endpoint for the container platform ──
const port = Number(process.env.PORT ?? 8080)
const server = http.createServer(async (req, res) => {
  if (req.url !== '/health') {
    res.writeHead(404).end()
    return
  }
  const checks = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, queues[0].queue.client.ping()])
  const [db, redis] = checks.map(c => (c.status === 'fulfilled' ? 'ok' : 'unreachable'))
  const healthy = db === 'ok' && redis === 'ok'
  res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', db, redis }))
})

async function shutdown(signal: string) {
  console.log(`${signal} received — draining workers`)
  server.close()
  await Promise.allSettled(queues.map(q => q.queue.close()))
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

server.listen(port, () => console.log(`[worker] health check on :${port}/health`))
scheduleJobs().catch(err => {
  console.error('[worker] failed to schedule jobs:', err)
  process.exit(1)
})
