import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { sprintSchema } from '@/lib/ai/schemas'
import { getUserId, unauthorized, serverError, ok, badRequest, aiFailure } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = await req.json()
    const { skillIds, customTopics } = body

    // 1. Get up to 3 unclosed gaps as base
    const gaps = await prisma.skillGap.findMany({
      where: { userId, closed: false },
      orderBy: { identifiedAt: 'desc' },
      take: 3,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    const baseSkills = gaps.map(g => g.missingSkill).join(', ')
    const aiContext = `Target role: ${user?.targetRole ?? 'Software Engineer'}. Base gaps to address: ${baseSkills}.`
    const userInstruction = customTopics 
      ? `MISSION OVERRIDE: Focus heavily on these custom topics: ${customTopics}. Still try to incorporate some relevant base gaps if they fit: ${baseSkills}.`
      : `Create a sprint to learn these skills in priority order: ${baseSkills}. Student current level: beginner to intermediate.`;

    // 2. Generate the plan before touching existing sprints, so an AI failure changes nothing
    const dayTasks = await generateJson({
      feature: 'sprint',
      system: PROMPTS.SPRINT_GENERATOR,
      prompt: `${aiContext} ${userInstruction}`,
      schema: sprintSchema,
      userId,
      maxTokens: 3000,
      temperature: 0.3,
    })

    // 3. Swap the active sprint atomically
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

    const [, sprint] = await prisma.$transaction([
      prisma.sprint.updateMany({
        where: { userId, status: 'active' },
        data: { status: 'abandoned' },
      }),
      prisma.sprint.create({
        data: {
          userId,
          weekStartDate: weekStart,
          dayTasks,
          completionPercentage: 0,
          skillsTargeted: customTopics ? [customTopics] : gaps.map(g => g.missingSkill),
          status: 'active',
        },
      }),
      // Mark gaps as sprint generated if we used them
      prisma.skillGap.updateMany({
        where: { id: { in: gaps.map(g => g.id) } },
        data: { sprintGenerated: true },
      }),
    ])

    return ok({ sprint })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
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
