import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

// GET /api/jobs/applications — student's own job applications with job details
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { appliedAt: 'desc' },
    })

    // Manually join job posting data since there's no relation in schema
    const jobIds = [...new Set(applications.map(a => a.jobPostingId))]
    const jobPostings = jobIds.length > 0
      ? await prisma.facultyJobPosting.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true, company: true, ctcMin: true, ctcMax: true, deadline: true },
        })
      : []
    const jobMap = Object.fromEntries(jobPostings.map(j => [j.id, j]))

    const enriched = applications.map(a => ({
      id: a.id,
      status: a.status,
      appliedAt: a.appliedAt,
      jobPosting: jobMap[a.jobPostingId] ?? null,
    }))

    return ok({ applications: enriched })
  } catch (err) {
    console.error('[jobs/applications GET]', err)
    return serverError()
  }
}
