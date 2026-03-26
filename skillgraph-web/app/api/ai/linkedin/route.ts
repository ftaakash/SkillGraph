import { NextRequest } from 'next/server'
import { callGPT, PROMPTS } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({
  headline: z.string().min(1),
  about: z.string().min(1),
  skillsList: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('headline, about, and skillsList are required')

    const { headline, about, skillsList } = parsed.data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    })

    const rawJson = await callGPT(
      PROMPTS.LINKEDIN_OPTIMIZER,
      `Optimize for role: ${user?.targetRole ?? 'Software Engineer'}. Original headline: ${headline}. Original about: ${about}. Current skills: ${skillsList}.`
    )

    const result = JSON.parse(rawJson)

    // Log the optimizer session for impact dashboard
    await prisma.optimizerSession.create({
      data: {
        userId: userId,
        targetRole: user?.targetRole ?? 'Software Engineer',
        atsScoreBefore: result.ats_score_estimate_before ?? 0,
        atsScoreAfter: result.ats_score_estimate_after ?? 0,
      },
    })

    // Increment optimizer sessions count
    await prisma.user.update({
      where: { id: userId },
      data: { optimizerSessions: { increment: 1 } },
    })

    return ok({ result })
  } catch (err) {
    console.error('[ai/linkedin]', err)
    return serverError()
  }
}
