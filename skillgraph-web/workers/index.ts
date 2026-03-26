import dotenv from 'dotenv'
// Load .env then override with .env.local
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })
import Queue from 'bull'
import Redis from 'ioredis'
import { runJobScraper } from './jobScraper'
import { prisma } from '../lib/prisma'
import { callGPTArray, PROMPTS } from '../lib/openai'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? '')

const redisUrl = process.env.REDIS_URL!

const bullOpts = {
  redis: {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }
}

// Initialize Bull Queues
const scraperQueue = new Queue('jobScraper', redisUrl, bullOpts)
const sprintQueue = new Queue('sprints', redisUrl, bullOpts)
const reportQueue = new Queue('monthlyReports', redisUrl, bullOpts)

// ── WORKER 1: Job Scraper ──
scraperQueue.process(async () => {
  await runJobScraper()
})

// ── WORKER 2: Sprint Generator ──
sprintQueue.process(async () => {
  console.log('[SprintGenerator] Checking for unprocessed high-urgency gaps...')
  const users = await prisma.skillGap.findMany({
    where: { urgency: 'high', closed: false, sprintGenerated: false },
    distinct: ['userId'],
    select: { userId: true },
  })

  for (const { userId } of users) {
    const activeSprint = await prisma.sprint.findFirst({ where: { userId, status: 'active' } })
    if (activeSprint) continue // already has one

    const gaps = await prisma.skillGap.findMany({
      where: { userId, urgency: 'high', closed: false, sprintGenerated: false },
      orderBy: { identifiedAt: 'desc' },
      take: 3,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, targetRole: true },
    })
    if (!user) continue

    try {
      const skillNames = gaps.map(g => g.missingSkill)
      const rawJson = await callGPTArray(
        PROMPTS.SPRINT_GENERATOR,
        `Create a sprint to learn: ${skillNames.join(', ')}. Role: ${user.targetRole ?? 'Software Engineer'}.`
      )
      const dayTasks = JSON.parse(rawJson)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

      await prisma.sprint.create({
        data: { userId, weekStartDate: weekStart, dayTasks, completionPercentage: 0, skillsTargeted: skillNames, status: 'active' },
      })

      await prisma.skillGap.updateMany({
        where: { id: { in: gaps.map(g => g.id) } },
        data: { sprintGenerated: true },
      })

      // Send email notification
      await sgMail.send({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL ?? '',
        subject: `⚡ Your 7-day sprint is ready, ${user.name}!`,
        html: `<p>Hi ${user.name},</p><p>Your personalized learning sprint for <strong>${skillNames.join(', ')}</strong> is ready!</p><p><a href="${process.env.NEXTAUTH_URL}/sprint">View Your Sprint →</a></p>`,
      })

      console.log(`[SprintGenerator] Sprint created for userId ${userId}`)
    } catch (err) {
      console.error(`[SprintGenerator] Error for userId ${userId}:`, err)
    }
  }
})

// ── WORKER 3: Monthly Report ──
reportQueue.process(async () => {
  console.log('[MonthlyReport] Generating monthly reports...')
  const users = await prisma.user.findMany({
    where: { readinessScore: { not: null } },
    select: { id: true, email: true, name: true, targetRole: true, readinessScore: true, readinessScorePrev: true, sprintsCompleted: true },
  })

  for (const user of users) {
    const delta = (user.readinessScore ?? 0) - (user.readinessScorePrev ?? 0)
    const sign = delta >= 0 ? '+' : ''
    try {
      await sgMail.send({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL ?? '',
        subject: `📊 Your SkillGraph Monthly Report — ${sign}${Math.round(delta)}pt this month`,
        html: `
          <h2>Monthly Readiness Report</h2>
          <p>Hi ${user.name},</p>
          <p>Your readiness score for <strong>${user.targetRole}</strong>:</p>
          <ul>
            <li>Current score: <strong>${Math.round(user.readinessScore ?? 0)}%</strong></li>
            <li>Change this month: <strong>${sign}${Math.round(delta)}pt</strong></li>
            <li>Sprints completed: <strong>${user.sprintsCompleted}</strong></li>
          </ul>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard">See Full Dashboard →</a></p>
        `,
      })

      // Reset readinessScorePrev for next month
      await prisma.user.update({
        where: { id: user.id },
        data: { readinessScorePrev: user.readinessScore },
      })
    } catch (err) {
      console.error(`[MonthlyReport] Error for userId ${user.id}:`, err)
    }
  }
  console.log('[MonthlyReport] Done')
})

// ── SCHEDULE RECURRING JOBS ──

async function scheduleJobs() {
  // Clear any existing repeatable jobs to prevent duplicates during restarts
  await Promise.all([
    scraperQueue.empty(),
    sprintQueue.empty(),
    reportQueue.empty(),
  ])

  // 0. Immediate one-off Job Scrape to populate database right now
  await scraperQueue.add({})

  // 1. Job Scraper: Every Sunday at 00:00 IST (18:30 UTC Saturday)
  await scraperQueue.add({}, { repeat: { cron: '30 18 * * 6' } })
  
  // 2. Sprint Generator: Every 5 minutes
  await sprintQueue.add({}, { repeat: { cron: '*/5 * * * *' } })

  // 3. Monthly Report: 1st of month at 02:30 UTC (8am IST)
  await reportQueue.add({}, { repeat: { cron: '30 2 1 * *' } })

  console.log('✅ SkillGraph Bull Workers started on Upstash Redis')
  console.log('   • Job Scraper: Every Sunday 00:00 IST')
  console.log('   • Sprint Generator: Every 5 minutes')
  console.log('   • Monthly Report: 1st of month 08:00 IST')
}

scheduleJobs().catch(console.error)
