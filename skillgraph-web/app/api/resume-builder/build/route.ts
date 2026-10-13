export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { tailorResumeDraft, NoResumeSource } from '@/lib/resume/tailor'
import { getUserId, unauthorized, badRequest, serverError, ok, aiFailure } from '@/lib/api'

const bodySchema = z.object({ targetJd: z.string().trim().min(50, 'Paste the full job description (at least a few sentences)').max(12_000) })

// POST /api/resume-builder/build — a JD-tailored résumé draft from the student's own résumé and profile
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')

    const { draft, usedUploadedResume } = await tailorResumeDraft(userId, parsed.data.targetJd)
    return ok({ resume: draft, usedUploadedResume })
  } catch (err) {
    if (err instanceof NoResumeSource) {
      return badRequest('Upload your résumé on the Dashboard first, so the draft is built from your real experience.')
    }
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[resume-builder/build]', err)
    return serverError()
  }
}
