import { NextRequest } from 'next/server'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { projectSuggestionsSchema } from '@/lib/ai/schemas'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest, aiFailure } from '@/lib/api'

// POST /api/ai/projects
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const [skills, openGaps, user] = await Promise.all([
      prisma.skillProfile.findMany({ where: { userId }, select: { skillName: true } }),
      prisma.skillGap.findMany({ where: { userId, closed: false }, select: { missingSkill: true, urgency: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { targetRole: true } }),
    ])
    if (!skills.length) return badRequest('No skills found. Please upload your resume first.')

    // Most urgent first (urgency is a word, so the database's alphabetical order would put "low" before "medium")
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const gaps = openGaps.sort((a, b) => (rank[a.urgency] ?? 3) - (rank[b.urgency] ?? 3)).slice(0, 5)

    const currentSkills = skills.map(s => s.skillName).join(', ')
    const gapSkills = gaps.map(g => g.missingSkill).join(', ')

    const projects = await generateJson({
      feature: 'project_ideas',
      system: PROMPTS.PROJECT_SUGGESTER,
      prompt: `Student knows: ${currentSkills}. Learning: ${gapSkills || 'nothing specific'}. Target role: ${user?.targetRole ?? 'Software Engineer'}. Suggest 5 projects that prove these skills to recruiters.`,
      schema: projectSuggestionsSchema,
      userId,
      maxTokens: 3000,
      temperature: 0.3,
    })
    return ok({ projects })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[ai/projects]', err)
    return serverError()
  }
}
