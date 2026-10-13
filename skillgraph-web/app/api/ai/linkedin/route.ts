import { NextRequest } from 'next/server'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { linkedinOptimizationSchema } from '@/lib/ai/schemas'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest, aiFailure } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({
  headline: z.string().trim().min(1).max(300),
  about: z.string().trim().min(1).max(3000),
  skillsList: z.string().trim().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('Fill in your headline (≤300 characters), About section (≤3000) and skills (≤2000)')

    const { headline, about, skillsList } = parsed.data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    const result = await generateJson({
      feature: 'linkedin_optimizer',
      system: PROMPTS.LINKEDIN_OPTIMIZER,
      prompt: `Optimize for role: ${user?.targetRole ?? 'Software Engineer'}. Original headline: ${headline}. Original about: ${about}. Current skills: ${skillsList}.`,
      schema: linkedinOptimizationSchema,
      userId,
      temperature: 0,
    })

    // Log the optimizer session for impact dashboard
    await prisma.optimizerSession.create({
      data: {
        userId: userId,
        targetRole: user?.targetRole ?? 'Software Engineer',
        atsScoreBefore: result.ats_score_estimate_before ?? 0,
        atsScoreAfter: result.ats_score_estimate_after ?? 0,
      },
    })

    await prisma.user.update({ where: { id: userId }, data: { optimizerSessions: { increment: 1 } } })

    return ok({ result })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[ai/linkedin]', err)
    return serverError()
  }
}
