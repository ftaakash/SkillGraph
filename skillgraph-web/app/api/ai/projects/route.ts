import { NextRequest } from 'next/server'
import { callGPTArray, callGPT, PROMPTS } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'

// POST /api/ai/projects
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const skills = await prisma.skillProfile.findMany({ where: { userId } })
    const gaps = await prisma.skillGap.findMany({
      where: { userId, closed: false },
      orderBy: { urgency: 'asc' },
      take: 5,
    })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    if (!skills.length) return badRequest('No skills found. Please upload your resume first.')

    const currentSkills = skills.map(s => s.skillName).join(', ')
    const gapSkills = gaps.map(g => g.missingSkill).join(', ')

    const rawJson = await callGPTArray(
      PROMPTS.PROJECT_SUGGESTER,
      `Student knows: ${currentSkills}. Learning: ${gapSkills || 'nothing specific'}. Target role: ${user?.targetRole ?? 'Software Engineer'}. Suggest 5 projects that prove these skills to recruiters.`
    )

    const projects = JSON.parse(rawJson)
    return ok({ projects })
  } catch (err) {
    console.error('[ai/projects]', err)
    return serverError()
  }
}
