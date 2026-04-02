import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { created, unauthorized, serverError, badRequest } from '@/lib/api'
import { z } from 'zod'

const applySchema = z.object({
  jobPostingId: z.string(),
  resumeVersionId: z.string().optional(),
  coverLetter: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()

    const body = await req.json()
    const parsed = applySchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.message)

    const existing = await prisma.jobApplication.findFirst({
      where: { userId: user.id, jobPostingId: parsed.data.jobPostingId },
    })
    if (existing) return badRequest('Already applied to this job')

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        jobPostingId: parsed.data.jobPostingId,
        resumeVersionId: parsed.data.resumeVersionId,
        coverLetter: parsed.data.coverLetter,
      },
    })

    // Increment application count on the job
    await prisma.facultyJobPosting.update({
      where: { id: parsed.data.jobPostingId },
      data: { applicationCount: { increment: 1 } },
    })

    return created({ application })
  } catch (err) {
    console.error('[jobs/apply POST]', err)
    return serverError()
  }
}
