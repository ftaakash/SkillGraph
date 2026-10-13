/**
 * Scheduled jobs, run by Vercel Cron (app/api/cron/[job]/route.ts) or by the optional
 * long-running worker (workers/index.ts).
 *
 * Vercel functions on the Hobby plan stop after 300 s, so every job takes a deadline and stops
 * starting new work after it. Jobs are written to resume: whatever wasn't reached is picked up
 * on the next run (each job only selects work that is still outstanding).
 */
import { prisma } from '@/lib/prisma'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { sprintSchema, jdSkillsSchema } from '@/lib/ai/schemas'
import { processOpenClawAgent } from '@/lib/openclaw/agent'
import { OPEN_STATUSES } from '@/lib/openclaw/status'
import { PLANS, type PlanId } from '@/lib/billing/plans'
import { emailConfigured, sendEmail, escapeHtml, appUrl } from '@/lib/email'

const DAY = 24 * 60 * 60 * 1000
/** No deadline: the long-running worker. */
export const NO_DEADLINE = Number.POSITIVE_INFINITY

const timeLeft = (deadline: number) => deadline - Date.now()

async function notify(to: string, subject: string, html: string, text: string) {
  if (!emailConfigured()) return false
  await sendEmail(to, subject, html, text)
  return true
}

// ── Billing maintenance: expire lapsed plans, drop abandoned checkouts, remind before renewal ──
export async function runBillingMaintenance() {
  const now = new Date()
  const expired = await prisma.subscription.updateMany({
    where: { status: 'active', periodEnd: { lte: now } },
    data: { status: 'expired' },
  })
  const abandoned = await prisma.subscription.deleteMany({
    where: { status: 'pending', createdAt: { lt: new Date(now.getTime() - 7 * DAY) } },
  })

  // Remind the purchaser once, about 7 days before a period ends (only if no later period is already paid)
  const ending = await prisma.subscription.findMany({
    where: { status: 'active', periodEnd: { gt: new Date(now.getTime() + 6 * DAY), lte: new Date(now.getTime() + 7 * DAY) } },
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
    const planName = PLANS[sub.plan as PlanId]?.name ?? sub.plan
    const ends = sub.periodEnd!.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    try {
      const sent = await notify(
        buyer.email,
        `Your SkillGraph ${planName} plan ends on ${ends}`,
        `<p>Hi ${escapeHtml(buyer.name)},</p><p>Your <strong>${escapeHtml(planName)}</strong> plan ends on ${ends}. Renew to keep your benefits without interruption.</p><p><a href="${appUrl('/billing')}">Renew now →</a></p>`,
        `Hi ${buyer.name}, your ${planName} plan ends on ${ends}. Renew at ${appUrl('/billing')}`,
      )
      if (sent) reminded++
    } catch (err) {
      console.error(`[billing] reminder failed for subscription ${sub.id}:`, (err as Error).message)
    }
  }
  return { expired: expired.count, abandonedCheckouts: abandoned.count, reminders: reminded }
}

// ── Sprints: a 7-day sprint for students with new high-urgency gaps and no active sprint ──
export async function runSprintGenerator(deadline: number) {
  const candidates = await prisma.skillGap.findMany({
    where: { urgency: 'high', closed: false, sprintGenerated: false },
    distinct: ['userId'],
    select: { userId: true },
  })
  let created = 0
  let remaining = 0
  for (const { userId } of candidates) {
    if (timeLeft(deadline) < 30_000) { remaining++; continue }
    if (await prisma.sprint.findFirst({ where: { userId, status: 'active' }, select: { id: true } })) continue

    const [gaps, user] = await Promise.all([
      prisma.skillGap.findMany({ where: { userId, urgency: 'high', closed: false, sprintGenerated: false }, orderBy: { identifiedAt: 'desc' }, take: 3 }),
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, targetRole: true } }),
    ])
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
        prisma.sprint.create({ data: { userId, weekStartDate: weekStart, dayTasks, completionPercentage: 0, skillsTargeted: skillNames, status: 'active' } }),
        prisma.skillGap.updateMany({ where: { id: { in: gaps.map(g => g.id) } }, data: { sprintGenerated: true } }),
      ])
      created++
      await notify(
        user.email,
        `Your 7-day sprint is ready, ${user.name}`,
        `<p>Hi ${escapeHtml(user.name)},</p><p>Your learning sprint for <strong>${escapeHtml(skillNames.join(', '))}</strong> is ready.</p><p><a href="${appUrl('/sprint')}">View your sprint →</a></p>`,
        `Hi ${user.name}, your learning sprint for ${skillNames.join(', ')} is ready: ${appUrl('/sprint')}`,
      ).catch(err => console.warn('[sprints] email failed:', (err as Error).message))
    } catch (err) {
      console.error(`[sprints] failed for user ${userId}:`, (err as Error).message)
    }
  }
  return { candidates: candidates.length, created, remaining }
}

// ── OpenClaw nightly run for every student with the agent switched on ──
export async function runOpenClawNightly(deadline: number) {
  const configs = await prisma.openClawConfig.findMany({ where: { isActive: true }, select: { userId: true } })
  // Random order, so a run that hits the deadline doesn't always leave out the same students
  const order = configs.map(c => c.userId).sort(() => Math.random() - 0.5)
  const outcome = { active: order.length, ran: 0, prepared: 0, submitted: 0, notReached: 0 }
  for (const userId of order) {
    // An agent run can take ~2 minutes; don't start one that can't finish
    if (timeLeft(deadline) < 120_000) { outcome.notReached++; continue }
    try {
      const result = await processOpenClawAgent(userId, { deadline: deadline - 15_000 })
      outcome.ran++
      outcome.prepared += result.prepared
      outcome.submitted += result.submitted
    } catch (err) {
      console.error(`[openclaw] run failed for user ${userId}:`, (err as Error).message)
    }
  }
  return outcome
}

// ── OpenClaw de-duplication: keep the earliest open application per student, company and role ──
export async function runOpenClawDedupe() {
  const apps = await prisma.openClawApplication.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    orderBy: { appliedAt: 'asc' },
    select: { id: true, userId: true, listing: { select: { company: true, role: true } } },
  })
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const app of apps) {
    const key = `${app.userId}::${app.listing.company.toLowerCase()}::${app.listing.role.toLowerCase()}`
    if (seen.has(key)) duplicates.push(app.id)
    else seen.add(key)
  }
  if (duplicates.length) await prisma.openClawApplication.updateMany({ where: { id: { in: duplicates } }, data: { status: 'Duplicate' } })
  return { deduped: duplicates.length, total: apps.length }
}

// ── Monthly readiness report (1st of the month) ──
export async function runMonthlyReports(deadline: number) {
  if (!emailConfigured()) return { skipped: 'email is not configured' }
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT', readinessScore: { not: null } },
    select: { id: true, email: true, name: true, targetRole: true, readinessScore: true, readinessScorePrev: true, sprintsCompleted: true },
  })
  let sent = 0
  let remaining = 0
  for (const user of users) {
    if (timeLeft(deadline) < 15_000) { remaining++; continue }
    const delta = Math.round((user.readinessScore ?? 0) - (user.readinessScorePrev ?? 0))
    const sign = delta >= 0 ? '+' : ''
    try {
      await sendEmail(
        user.email,
        `Your SkillGraph monthly report: ${sign}${delta} points`,
        `<h2>Monthly readiness report</h2><p>Hi ${escapeHtml(user.name)},</p>
         <p>Your readiness for <strong>${escapeHtml(user.targetRole ?? 'your target role')}</strong>:</p>
         <ul><li>Current score: <strong>${Math.round(user.readinessScore ?? 0)}%</strong></li>
         <li>Change this month: <strong>${sign}${delta} points</strong></li>
         <li>Sprints completed: <strong>${user.sprintsCompleted}</strong></li></ul>
         <p><a href="${appUrl('/dashboard')}">See your dashboard →</a></p>`,
        `Hi ${user.name}, your readiness is ${Math.round(user.readinessScore ?? 0)}% (${sign}${delta} this month). ${appUrl('/dashboard')}`,
      )
      await prisma.user.update({ where: { id: user.id }, data: { readinessScorePrev: user.readinessScore } })
      sent++
    } catch (err) {
      console.error(`[reports] failed for user ${user.id}:`, (err as Error).message)
    }
  }
  return { students: users.length, sent, remaining }
}

// ── Market data: job postings and their required skills, refreshed weekly ──
const MARKET_ROLES = [
  'Software Development Engineer', 'Data Analyst', 'Machine Learning Engineer',
  'DevOps Engineer', 'Full Stack Developer', 'Cloud Architect',
  'Backend Developer', 'Frontend Developer', 'Data Scientist', 'Product Manager',
]
const JOBS_PER_ROLE = 30
const EXTRACT_CONCURRENCY = 4

export function currentDemandWeek(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

async function fetchMarketJobs(role: string) {
  const host = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com'
  const params = new URLSearchParams({ query: `${role} India`, page: '1', num_pages: '1', country: 'in' })
  const res = await fetch(`https://${host}/search?${params}`, {
    headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY!, 'x-rapidapi-host': host },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`JSearch responded with HTTP ${res.status}`)
  const body = (await res.json()) as { data?: { job_title: string; job_description?: string; employer_name: string; job_city?: string }[] }
  return (body.data ?? []).slice(0, JOBS_PER_ROLE).map(job => ({
    company: job.employer_name,
    location: job.job_city ?? 'India',
    description: job.job_description?.slice(0, 2000) ?? '',
  }))
}

async function extractSkills(description: string): Promise<string[]> {
  try {
    const skills = await generateJson({
      feature: 'jd_skill_extract',
      system: PROMPTS.JD_SKILL_EXTRACTOR,
      prompt: `Extract required skills from this job description:\n\n${description}`,
      schema: jdSkillsSchema,
      userId: null,
      maxTokens: 500,
      temperature: 0,
    })
    return skills.map(s => s.trim()).filter(Boolean)
  } catch (err) {
    console.warn('[market] skill extraction failed:', (err as Error).message)
    return []
  }
}

/**
 * Loads this week's postings role by role, skipping roles already loaded this week, so a run
 * that stops at the deadline is completed by the next one. Each role is written in one
 * transaction, so a role is either fully loaded or not at all.
 */
export async function runMarketRefresh(deadline: number) {
  if (!process.env.RAPIDAPI_KEY) return { skipped: 'RAPIDAPI_KEY is not set' }
  const week = currentDemandWeek()
  const done = new Set(
    (await prisma.jobPosting.findMany({ where: { demandWeek: week, source: 'jsearch' }, distinct: ['role'], select: { role: true } })).map(r => r.role),
  )
  const outcome = { week, loaded: [] as string[], alreadyLoaded: done.size, remaining: 0, failed: [] as string[] }
  for (const role of MARKET_ROLES) {
    if (done.has(role)) continue
    // ~30 skill extractions at 4 in parallel: allow about 90 s per role
    if (timeLeft(deadline) < 90_000) { outcome.remaining++; continue }
    try {
      const jobs = await fetchMarketJobs(role)
      const skills: string[][] = []
      for (let i = 0; i < jobs.length; i += EXTRACT_CONCURRENCY) {
        skills.push(...(await Promise.all(jobs.slice(i, i + EXTRACT_CONCURRENCY).map(j => extractSkills(j.description)))))
      }
      await prisma.jobPosting.createMany({
        data: jobs.map((job, i) => ({
          company: job.company,
          role,
          location: job.location,
          rawDescription: job.description,
          requiredSkills: skills[i] ?? [],
          demandWeek: week,
          source: 'jsearch',
        })),
      })
      outcome.loaded.push(`${role} (${jobs.length})`)
    } catch (err) {
      outcome.failed.push(role)
      console.error(`[market] ${role}:`, (err as Error).message)
    }
  }
  return outcome
}
