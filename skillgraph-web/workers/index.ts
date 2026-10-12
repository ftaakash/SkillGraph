/**
 * SkillGraph background worker (separate service from the Next.js app — see ADR-001).
 * Run with:  npm run worker      (tsx resolves the project's "@/..." path aliases)
 */
import dotenv from 'dotenv'
// Load .env then override with .env.local (no-ops in containers that inject env vars)
dotenv.config({ path: '.env', quiet: true })
dotenv.config({ path: '.env.local', override: true, quiet: true })

import http from 'http'
import Queue from 'bull'
import sgMail from '@sendgrid/mail'
import { runJobScraper } from './jobScraper'
import { prisma } from '../lib/prisma'
import { PROMPTS } from '../lib/openai'
import { generateJson } from '../lib/ai'
import { sprintSchema } from '../lib/ai/schemas'
import { processOpenClawAgent } from '../lib/openclaw/agent'
import { PLANS, type PlanId } from '../lib/billing/plans'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL is required to run the worker.')
  process.exit(1)
}

const sendgridReady = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL)
if (sendgridReady) sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function sendEmail(to: string, subject: string, html: string) {
  if (!sendgridReady) return console.warn(`[email] SendGrid not configured — skipped "${subject}" to ${to}`)
  await sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL!, subject, html })
}

// rediss:// enables TLS with certificate verification (ioredis default); never disable verification
const bullOpts: Queue.QueueOptions = {
  redis: { maxRetriesPerRequest: null, enableReadyCheck: false },
}

const scraperQueue = new Queue('jobScraper', redisUrl, bullOpts)
const sprintQueue = new Queue('sprints', redisUrl, bullOpts)
const reportQueue = new Queue('monthlyReports', redisUrl, bullOpts)
const openclawQueue = new Queue('openclaw', redisUrl, bullOpts)
const billingQueue = new Queue('billing', redisUrl, bullOpts)
const queues = [scraperQueue, sprintQueue, reportQueue, openclawQueue, billingQueue]

// ── WORKER 1: Weekly market data (JSearch) ──
scraperQueue.process(async () => {
  await runJobScraper()
})

// ── WORKER 2: Sprint Generator ──
sprintQueue.process(async () => {
  const users = await prisma.skillGap.findMany({
    where: { urgency: 'high', closed: false, sprintGenerated: false },
    distinct: ['userId'],
    select: { userId: true },
  })

  for (const { userId } of users) {
    const activeSprint = await prisma.sprint.findFirst({ where: { userId, status: 'active' } })
    if (activeSprint) continue

    const gaps = await prisma.skillGap.findMany({
      where: { userId, urgency: 'high', closed: false, sprintGenerated: false },
      orderBy: { identifiedAt: 'desc' },
      take: 3,
    })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, targetRole: true },
    })
    if (!user || gaps.length === 0) continue

    try {
      const skillNames = gaps.map(g => g.missingSkill)
      const dayTasks = await generateJson({
        feature: 'sprint',
        system: PROMPTS.SPRINT_GENERATOR,
        prompt: `Create a sprint to learn: ${skillNames.join(', ')}. Role: ${user.targetRole ?? 'Software Engineer'}.`,
        schema: sprintSchema,
        userId,
        maxTokens: 3000,
        temperature: 0.3,
      })
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

      await prisma.$transaction([
        prisma.sprint.create({
          data: { userId, weekStartDate: weekStart, dayTasks, completionPercentage: 0, skillsTargeted: skillNames, status: 'active' },
        }),
        prisma.skillGap.updateMany({ where: { id: { in: gaps.map(g => g.id) } }, data: { sprintGenerated: true } }),
      ])

      await sendEmail(
        user.email,
        `⚡ Your 7-day sprint is ready, ${user.name}!`,
        `<p>Hi ${escapeHtml(user.name)},</p><p>Your personalised learning sprint for <strong>${escapeHtml(skillNames.join(', '))}</strong> is ready!</p><p><a href="${process.env.NEXTAUTH_URL}/sprint">View your sprint →</a></p>`
      )
      console.log(`[SprintGenerator] Sprint created for user ${userId}`)
    } catch (err) {
      console.error(`[SprintGenerator] Error for user ${userId}:`, (err as Error).message)
    }
  }
})

// ── WORKER 3: Monthly Report ──
reportQueue.process(async () => {
  const users = await prisma.user.findMany({
    where: { readinessScore: { not: null } },
    select: { id: true, email: true, name: true, targetRole: true, readinessScore: true, readinessScorePrev: true, sprintsCompleted: true },
  })

  for (const user of users) {
    const delta = (user.readinessScore ?? 0) - (user.readinessScorePrev ?? 0)
    const sign = delta >= 0 ? '+' : ''
    try {
      await sendEmail(
        user.email,
        `📊 Your SkillGraph Monthly Report — ${sign}${Math.round(delta)}pt this month`,
        `
          <h2>Monthly Readiness Report</h2>
          <p>Hi ${escapeHtml(user.name)},</p>
          <p>Your readiness score for <strong>${escapeHtml(user.targetRole ?? 'your target role')}</strong>:</p>
          <ul>
            <li>Current score: <strong>${Math.round(user.readinessScore ?? 0)}%</strong></li>
            <li>Change this month: <strong>${sign}${Math.round(delta)}pt</strong></li>
            <li>Sprints completed: <strong>${user.sprintsCompleted}</strong></li>
          </ul>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard">See full dashboard →</a></p>
        `
      )
      await prisma.user.update({ where: { id: user.id }, data: { readinessScorePrev: user.readinessScore } })
    } catch (err) {
      console.error(`[MonthlyReport] Error for user ${user.id}:`, (err as Error).message)
    }
  }
})

// ── WORKER 4: OpenClaw nightly assisted-apply preparation ──
openclawQueue.process(async () => {
  const configs = await prisma.openClawConfig.findMany({ where: { isActive: true }, select: { userId: true } })
  console.log(`[OpenClaw] Nightly run for ${configs.length} active student(s)`)
  for (const { userId } of configs) {
    try {
      await processOpenClawAgent(userId)
    } catch (err) {
      console.error(`[OpenClaw] Run failed for user ${userId}:`, (err as Error).message)
    }
  }
})

// ── WORKER 5: Billing maintenance (expiry, abandoned checkouts, renewal reminders) ──
billingQueue.process(async () => {
  const now = new Date()
  const expired = await prisma.subscription.updateMany({
    where: { status: 'active', periodEnd: { lte: now } },
    data: { status: 'expired' },
  })
  const abandoned = await prisma.subscription.deleteMany({
    where: { status: 'pending', createdAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
  })

  // Remind the purchaser once, 7 days before a period ends (only if no later period is already paid)
  const windowStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const ending = await prisma.subscription.findMany({
    where: { status: 'active', periodEnd: { gt: windowStart, lte: windowEnd } },
  })
  let reminded = 0
  for (const sub of ending) {
    const renewed = await prisma.subscription.findFirst({
      where: { ownerType: sub.ownerType, ownerId: sub.ownerId, plan: sub.plan, status: 'active', periodStart: { gte: sub.periodEnd! } },
      select: { id: true },
    })
    if (renewed) continue
    const buyer = await prisma.user.findUnique({ where: { id: sub.purchasedByUserId }, select: { email: true, name: true } })
    if (!buyer) continue
    const plan = PLANS[sub.plan as PlanId]
    try {
      await sendEmail(
        buyer.email,
        `Your SkillGraph ${plan?.name ?? 'plan'} ends on ${sub.periodEnd!.toLocaleDateString('en-IN')}`,
        `<p>Hi ${escapeHtml(buyer.name)},</p><p>Your <strong>${escapeHtml(plan?.name ?? sub.plan)}</strong> plan ends on ${sub.periodEnd!.toLocaleDateString('en-IN')}. Renew to keep your benefits without interruption.</p><p><a href="${process.env.NEXTAUTH_URL}/billing">Renew now →</a></p>`
      )
      reminded++
    } catch (err) {
      console.error(`[Billing] reminder failed for subscription ${sub.id}:`, (err as Error).message)
    }
  }
  console.log(`[Billing] expired=${expired.count} abandonedCheckouts=${abandoned.count} reminders=${reminded}`)
})

for (const q of queues) {
  q.on('failed', (job, err) => console.error(`[${q.name}] job ${job.id} failed:`, err.message))
}

async function scheduleJobs() {
  // Remove stale repeatable schedules so cron changes take effect on deploy
  for (const q of queues) {
    for (const r of await q.getRepeatableJobs()) await q.removeRepeatableByKey(r.key)
  }

  await scraperQueue.add({}, { repeat: { cron: '30 18 * * 6' } })   // Sunday 00:00 IST
  await sprintQueue.add({}, { repeat: { cron: '*/5 * * * *' } })     // every 5 minutes
  await reportQueue.add({}, { repeat: { cron: '30 2 1 * *' } })      // 1st of month 08:00 IST
  await openclawQueue.add({}, { repeat: { cron: '0 1 * * *' } })     // daily 06:30 IST
  await billingQueue.add({}, { repeat: { cron: '30 0 * * *' } })     // daily 06:00 IST

  // Optional immediate market-data refresh (uses paid API quota)
  if (process.env.RUN_SCRAPER_ON_START === 'true') await scraperQueue.add({})

  console.log('✅ SkillGraph workers started: market data (weekly), sprints (5 min), reports (monthly), OpenClaw (daily), billing (daily)')
}

// ── Health endpoint for the container platform ──
const port = Number(process.env.PORT ?? 8080)
const server = http.createServer(async (req, res) => {
  if (req.url !== '/health') {
    res.writeHead(404).end()
    return
  }
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    scraperQueue.client.ping(),
  ])
  const [db, redis] = checks.map(c => (c.status === 'fulfilled' ? 'ok' : 'unreachable'))
  const healthy = db === 'ok' && redis === 'ok'
  res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', db, redis }))
})

async function shutdown(signal: string) {
  console.log(`${signal} received — draining workers`)
  server.close()
  await Promise.allSettled(queues.map(q => q.close()))
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
