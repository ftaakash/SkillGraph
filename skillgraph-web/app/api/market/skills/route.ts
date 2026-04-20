import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverError, ok } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role') // optional filter

    // Get current ISO week number
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const currentWeek = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)

    const whereClause = {
      demandWeek: currentWeek,
      ...(role ? { role: { contains: role, mode: 'insensitive' as const } } : {}),
    }

    // Try to get data for current week
    let jobs = await prisma.jobPosting.findMany({ where: whereClause, take: 500 })

    let weekToReport = currentWeek;

    // FALLBACK: If current week is empty, find the most recent week with data
    if (jobs.length === 0) {
      const mostRecent = await prisma.jobPosting.findFirst({
        orderBy: { demandWeek: 'desc' },
        select: { demandWeek: true }
      });
      if (mostRecent) {
        weekToReport = mostRecent.demandWeek;
        jobs = await prisma.jobPosting.findMany({
          where: {
            demandWeek: weekToReport,
            ...(role ? { role: { contains: role, mode: 'insensitive' as const } } : {}),
          },
          take: 500
        });
      }
    }

    // Aggregate skill frequency
    const skillFreq: Record<string, number> = {}
    for (const job of jobs) {
      const skills = (job.requiredSkills as string[]) || []
      for (const skill of skills) {
        if (skill && skill.length > 1) {
          skillFreq[skill] = (skillFreq[skill] || 0) + 1
        }
      }
    }

    const topSkills = Object.entries(skillFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))

    const lastScraped = await prisma.jobPosting.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    })

    return ok({
      week: weekToReport,
      role: role ?? 'All Roles',
      topSkills,
      totalJobsAnalyzed: jobs.length,
      lastUpdated: lastScraped?.scrapedAt ?? null,
    })
  } catch (err) {
    console.error('[market/skills]', err)
    return serverError()
  }
}
