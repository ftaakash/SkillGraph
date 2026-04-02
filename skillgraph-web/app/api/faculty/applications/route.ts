import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string; collegeId?: string }
    if (user.role !== 'FACULTY') return unauthorized()

    const jobs = await prisma.facultyJobPosting.findMany({
      where: { collegeId: user.collegeId || '' },
      select: { id: true },
    })
    const jobIds = jobs.map(j => j.id)

    const applications = await prisma.jobApplication.findMany({
      where: { jobPostingId: { in: jobIds } },
      include: { user: { select: { id: true, name: true, email: true, branch: true, cgpa: true, readinessScore: true } } },
      orderBy: { appliedAt: 'desc' },
    })
    return ok({ applications })
  } catch (err) {
    console.error('[faculty/applications GET]', err)
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string }
    if (user.role !== 'FACULTY') return unauthorized()

    const { applicationId, status } = await req.json()
    if (!applicationId || !status) return badRequest('applicationId and status required')

    const validStatuses = ['Applied', 'Shortlisted', 'OA', 'Interview', 'Offered', 'Placed', 'Rejected']
    if (!validStatuses.includes(status)) return badRequest('Invalid status')

    const application = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    })
    return ok({ application })
  } catch (err) {
    console.error('[faculty/applications PATCH]', err)
    return serverError()
  }
}
