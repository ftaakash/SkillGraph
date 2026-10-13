import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { studentCollegeId } from '@/lib/tenant'

const HOUR = 60 * 60 * 1000
const NEW_FOR_MS = 48 * HOUR
const CLOSING_SOON_MS = 24 * HOUR
const CLOSED_VISIBLE_MS = 30 * 24 * HOUR

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()

    // Campus jobs come from the college the student has joined (read fresh, not from the session)
    const collegeId = await studentCollegeId(user.id)
    if (!collegeId) return ok({ jobs: [], joinedCollege: false, stats: { total: 0, open: 0, closingSoon: 0 } })

    const now = Date.now()
    // Open drives first (soonest deadline), then the last month's closed drives for reference
    const [open, closed, applications] = await Promise.all([
      prisma.facultyJobPosting.findMany({ where: { collegeId, deadline: { gte: new Date(now) } }, orderBy: { deadline: 'asc' } }),
      prisma.facultyJobPosting.findMany({
        where: { collegeId, deadline: { lt: new Date(now), gte: new Date(now - CLOSED_VISIBLE_MS) } },
        orderBy: { deadline: 'desc' },
        take: 100,
      }),
      prisma.jobApplication.findMany({ where: { userId: user.id }, select: { jobPostingId: true, status: true, channel: true } }),
    ])
    const applied = new Map(applications.map(a => [a.jobPostingId, a]))

    const jobs = [...open, ...closed].map(job => {
      const msLeft = job.deadline.getTime() - now
      const application = applied.get(job.id)
      return {
        ...job,
        isOpen: msLeft >= 0,
        isNew: now - job.createdAt.getTime() < NEW_FOR_MS,
        closingSoon: msLeft >= 0 && msLeft <= CLOSING_SOON_MS,
        application: application ? { status: application.status, channel: application.channel } : null,
      }
    })
    const total = await prisma.facultyJobPosting.count({ where: { collegeId } })
    return ok({
      jobs,
      joinedCollege: true,
      stats: { total, open: open.length, closingSoon: jobs.filter(j => j.closingSoon).length },
    })
  } catch (err) {
    console.error('[jobs GET]', err)
    return serverError()
  }
}
