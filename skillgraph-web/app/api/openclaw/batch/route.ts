import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'
import { AiError, aiErrorResponse } from '@/lib/ai'
import { resolveJobFromUrl, JobSourceError } from '@/lib/jobs'
import { evaluateListing } from '@/lib/openclaw/evaluate'

export const maxDuration = 300

const bodySchema = z.object({ jobUrls: z.array(z.string().trim().url().max(2000)).min(1).max(10) })
const CONCURRENCY = 3

// POST /api/openclaw/batch — evaluate up to 10 job links
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('jobUrls must be 1–10 valid URLs')
    const jobUrls = parsed.data.jobUrls

    const results: Array<{ url: string; grade?: string; score?: number; error?: string }> = []
    for (let i = 0; i < jobUrls.length; i += CONCURRENCY) {
      const chunk = jobUrls.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(
        chunk.map(async url => {
          const { evaluation } = await evaluateListing(userId, await resolveJobFromUrl(url))
          return { url, grade: evaluation?.grade, score: evaluation?.totalScore }
        })
      )
      settled.forEach((s, idx) => {
        if (s.status === 'fulfilled') return results.push(s.value)
        const err = s.reason
        const message = err instanceof JobSourceError ? err.message : err instanceof AiError ? aiErrorResponse(err).error : 'Evaluation failed'
        if (!(err instanceof JobSourceError)) console.error('[openclaw/batch]', chunk[idx], err)
        results.push({ url: chunk[idx], error: message })
      })
    }

    return ok({ results })
  } catch (err) {
    console.error('[openclaw/batch]', err)
    return serverError()
  }
}
