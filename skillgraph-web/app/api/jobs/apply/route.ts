import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { created, unauthorized, serverError, badRequest } from '@/lib/api'
import { z } from 'zod'
import { campusApplyBlocker } from '@/lib/tenant'

const applySchema = z.object({
  jobPostingId: z.string().min(1).max(40),
  resumeVersionId: z.string().min(1).max(40).optional(),
  coverLetter: z.string().trim().max(5000, 'Cover letters are limited to 5000 characters').optional(),
})

class AlreadyApplied extends Error {}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()
    const userId = user.id

    const parsed = applySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid application')
    const { jobPostingId, resumeVersionId, coverLetter } = parsed.data

    // The posting must belong to the student's college and still be open
    const blocker = await campusApplyBlocker(userId, jobPostingId)
    if (blocker) return badRequest(blocker)

    // Only the student's own résumé versions can be attached
    if (resumeVersionId) {
      const owned = await prisma.resumeVersion.findFirst({ where: { id: resumeVersionId, userId }, select: { id: true } })
      if (!owned) return badRequest('Résumé version not found')
    }

    // Serializable so a double-click can't create two applications or count one twice
    const application = await prisma.$transaction(async tx => {
      const existing = await tx.jobApplication.findFirst({ where: { userId, jobPostingId }, select: { id: true } })
      if (existing) throw new AlreadyApplied()
      const row = await tx.jobApplication.create({
        data: { userId, jobPostingId, resumeVersionId, coverLetter: coverLetter || undefined },
      })
      await tx.facultyJobPosting.update({ where: { id: jobPostingId }, data: { applicationCount: { increment: 1 } } })
      return row
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return created({ application })
  } catch (err) {
    if (err instanceof AlreadyApplied) return badRequest('Already applied to this job')
    // P2034: a concurrent duplicate lost the serialization race
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') return badRequest('Already applied to this job')
    console.error('[jobs/apply POST]', err)
    return serverError()
  }
}
