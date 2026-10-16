import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverError, ok } from '@/lib/api'
import { cached } from '@/lib/cache'

// Market data changes weekly; recomputing per request is wasted database work
const TTL_MS = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')?.trim().slice(0, 100) || null // optional filter
    return ok(await cached(`market:skills:${role?.toLowerCase() ?? ''}`, TTL_MS, () => computeSkillDemand(role)))
  } catch (err) {
    console.error('[market/skills]', err)
    return serverError()
  }
}

const DAY = 24 * 60 * 60 * 1000

/** Skills asked for by role, counted per job posting. */
function skillCounts(jobs: { requiredSkills: unknown }[]) {
  const freq: Record<string, number> = {}
  for (const job of jobs) {
    const skills = Array.isArray(job.requiredSkills) ? (job.requiredSkills as string[]) : []
    for (const skill of skills) if (skill && skill.length > 1) freq[skill] = (freq[skill] || 0) + 1
  }
  return freq
}

/**
 * Demand from the most recent week of loaded postings, compared with the week before it.
 * Weeks are taken from when postings were loaded (scrapedAt), not the stored week number,
 * which has no year and would mix this year's data with last year's.
 */
async function computeSkillDemand(role: string | null) {
  const roleFilter = role ? { role: { contains: role, mode: 'insensitive' as const } } : {}
  const latest = await prisma.jobPosting.findFirst({ where: roleFilter, orderBy: { scrapedAt: 'desc' }, select: { scrapedAt: true, demandWeek: true } })
  if (!latest) return { week: null, role: role ?? 'All Roles', topSkills: [], totalJobsAnalyzed: 0, lastUpdated: null }

  const end = latest.scrapedAt.getTime()
  const window = (from: number, to: number) =>
    prisma.jobPosting.findMany({
      where: { ...roleFilter, scrapedAt: { gt: new Date(from), lte: new Date(to) } },
      select: { requiredSkills: true },
      take: 500,
    })
  const [jobs, prevJobs] = await Promise.all([window(end - 7 * DAY, end), window(end - 14 * DAY, end - 7 * DAY)])

  const freq = skillCounts(jobs)
  const prevFreq = skillCounts(prevJobs)
  const share = (count: number, total: number) => (total > 0 ? (count / total) * 100 : 0)

  const topSkills = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([skill, count]) => ({
      skill,
      count,
      // Percentage-point shift in the share of postings asking for the skill; null without an earlier week
      change: prevJobs.length > 0 ? Math.round(share(count, jobs.length) - share(prevFreq[skill] ?? 0, prevJobs.length)) : null,
    }))

  return {
    week: latest.demandWeek,
    role: role ?? 'All Roles',
    topSkills,
    totalJobsAnalyzed: jobs.length,
    lastUpdated: latest.scrapedAt,
  }
}
