import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGPTArray, PROMPTS } from '@/lib/openai'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = await req.json()
    const { skillIds } = body // optional: manually override which gaps to use

    // Get up to 3 unclosed gaps for the next sprint
    const gaps = await prisma.skillGap.findMany({
      where: { userId, closed: false, sprintGenerated: false },
      orderBy: { identifiedAt: 'desc' },
      take: 3,
    })

    if (gaps.length === 0) return badRequest('No capability gaps found in the database. Please initialize a new Gap Analysis first.')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    const skillNames = gaps.map(g => g.missingSkill)

    // Call GPT-4o sprint generator
    const rawJson = await callGPTArray(
      PROMPTS.SPRINT_GENERATOR,
      `Create a sprint to learn these skills in priority order: ${skillNames.join(', ')}. Student current level: beginner to intermediate. Target role: ${user?.targetRole ?? 'Software Engineer'}.`
    )

    let dayTasks
    try {
      dayTasks = JSON.parse(rawJson)
    } catch {
      return serverError('AI returned invalid sprint data. Please retry.')
    }

    // Create sprint record
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday

    const sprint = await prisma.sprint.create({
      data: {
        userId,
        weekStartDate: weekStart,
        dayTasks,
        completionPercentage: 0,
        skillsTargeted: skillNames,
        status: 'active',
      },
    })

    // Mark gaps as sprint generated
    await prisma.skillGap.updateMany({
      where: { id: { in: gaps.map(g => g.id) } },
      data: { sprintGenerated: true },
    })

    return ok({ sprint })
  } catch (err) {
    console.error('[sprints/generate]', err)
    return serverError()
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const sprint = await prisma.sprint.findFirst({
      where: { userId: userId, status: 'active' },
      orderBy: { generatedAt: 'desc' },
    })

    return ok({ sprint })
  } catch (err) {
    console.error('[sprints GET]', err)
    return serverError()
  }
}
