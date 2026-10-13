import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { sprintSchema } from '@/lib/ai/schemas'
import { getUserId, unauthorized, serverError, ok, badRequest, aiFailure } from '@/lib/api'

const bodySchema = z.object({ customTopics: z.string().trim().max(300).optional() })

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return badRequest('Custom topics must be under 300 characters')
    const customTopics = parsed.data.customTopics || undefined

    // 1. The 3 most urgent open gaps (urgency is a word, so rank it here rather than in SQL)
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const openGaps = await prisma.skillGap.findMany({
      where: { userId, closed: false },
      orderBy: { identifiedAt: 'desc' }, // newest analysis first; the sort below is stable
    })
    const gaps = openGaps.sort((a, b) => (rank[a.urgency] ?? 3) - (rank[b.urgency] ?? 3)).slice(0, 3)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    if (gaps.length === 0 && !customTopics) {
      return badRequest('No open skill gaps yet. Run a gap analysis first, or enter custom topics.')
    }

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
        where: { userId, status: 'active' }, // completed sprints keep their status
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

    // The current sprint stays visible after it is completed, until a new one replaces it
    const sprint = await prisma.sprint.findFirst({
      where: { userId, status: { in: ['active', 'completed'] } },
      orderBy: { generatedAt: 'desc' },
    })

    return ok({ sprint })
  } catch (err) {
    console.error('[sprints GET]', err)
    return serverError()
  }
}
