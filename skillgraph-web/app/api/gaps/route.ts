import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGPT, PROMPTS } from '@/lib/openai'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = await req.json()
    const { targetRole } = body

    if (!targetRole) return badRequest('targetRole is required')


    // Get user's current skills
    const skills = await prisma.skillProfile.findMany({ where: { userId } })
    const userSkillsJson = JSON.stringify(skills.map(s => s.skillName))

    // Get top required skills from job postings this week
    const currentWeek = Math.ceil(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    )
    const recentJobs = await prisma.jobPosting.findMany({
      where: { role: { contains: targetRole, mode: 'insensitive' }, demandWeek: currentWeek },
      take: 50,
    })

    // Aggregate skill frequencies
    const skillFreq: Record<string, number> = {}
    for (const job of recentJobs) {
      const jobSkills = job.requiredSkills as string[]
      for (const s of jobSkills) {
        skillFreq[s] = (skillFreq[s] || 0) + 1
      }
    }
    const marketSkills = Object.entries(skillFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([s]) => s)

    const marketSkillsJson = JSON.stringify(marketSkills)

    // Call GPT-4o gap analyzer
    const rawJson = await callGPT(
      PROMPTS.GAP_ANALYZER,
      `Student skills: ${userSkillsJson}. Target role: ${targetRole}. Top skills required by market: ${marketSkillsJson}. Analyze the gap.`
    )
    const analysis = JSON.parse(rawJson)

    // Update user's readiness score
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { readinessScore: true } })
    await prisma.user.update({
      where: { id: userId },
      data: {
        readinessScorePrev: user?.readinessScore,
        readinessScore: analysis.readiness_percentage,
        targetRole,
      },
    })

    // Delete old unclosed gaps and save new ones
    await prisma.skillGap.deleteMany({ where: { userId, closed: false } })

    if (analysis.missing_skills?.length > 0) {
      await prisma.skillGap.createMany({
        data: analysis.missing_skills.map((g: {
          skill: string; urgency: string; weeks_to_learn: number; why_important: string
        }) => ({
          userId,
          missingSkill: g.skill,
          urgency: g.urgency,
          weeksToLearn: g.weeks_to_learn,
          whyImportant: g.why_important,
        })),
      })
    }

    // Store anonymous benchmark
    await prisma.benchmark.create({
      data: {
        role: targetRole,
        year: (await prisma.user.findUnique({ where: { id: userId }, select: { year: true } }))?.year ?? 'Unknown',
        readinessScore: analysis.readiness_percentage,
        collegeTier: 'Tier-2',
      },
    })

    return ok({ analysis })
  } catch (err) {
    console.error('[gaps/analyze]', err)
    return serverError()
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const gaps = await prisma.skillGap.findMany({
      where: { userId: userId },
      orderBy: [
        { urgency: 'asc' },   // high comes first alphabetically
        { identifiedAt: 'desc' },
      ],
    })

    // Sort: high > medium > low
    const order = { high: 0, medium: 1, low: 2 }
    gaps.sort((a, b) => (order[a.urgency as keyof typeof order] ?? 2) - (order[b.urgency as keyof typeof order] ?? 2))

    return ok({ gaps })
  } catch (err) {
    console.error('[gaps GET]', err)
    return serverError()
  }
}
