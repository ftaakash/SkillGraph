import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { ok, unauthorized, serverError, badRequest, aiFailure, jobSourceFailure } from '@/lib/api'
import { resolveJobFromUrl, listingFromPastedText } from '@/lib/jobs'
import { evaluateListing } from '@/lib/openclaw/evaluate'
import { firstIssue } from '@/lib/validation/auth'

export const maxDuration = 60

// Either a job link (official ATS API / public career page) or pasted JD text (required for LinkedIn, Naukri, …)
const bodySchema = z.union([
  z.object({ jobUrl: z.string().trim().url().max(2000) }),
  z.object({
    jdText: z.string().min(1).max(20000),
    company: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    location: z.string().trim().max(200).optional(),
    sourceUrl: z.string().trim().url().max(2000).optional().or(z.literal('')),
  }),
])

// POST /api/openclaw/pipeline — evaluate one job for the signed-in student
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Provide a job link, or the job description with company and role.' + (parsed.error.issues.length ? ` (${firstIssue(parsed.error)})` : ''))

    const job = 'jobUrl' in parsed.data
      ? await resolveJobFromUrl(parsed.data.jobUrl)
      : listingFromPastedText(parsed.data)

    const result = await evaluateListing(userId, job)
    return ok({
      ...result,
      message: result.existing ? 'Already in your pipeline — showing the existing evaluation' : undefined,
    })
  } catch (err) {
    const failure = jobSourceFailure(err) ?? aiFailure(err)
    if (failure) return failure
    console.error('[openclaw/pipeline]', err)
    return serverError()
  }
}
