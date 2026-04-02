import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string; collegeId?: string }
    if (user.role !== 'FACULTY') return unauthorized()

    const collegeId = user.collegeId || ''

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', college: { not: null } } })

    const avgReadiness = await prisma.user.aggregate({
      where: { role: 'STUDENT' },
      _avg: { readinessScore: true },
    })

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const jobs = await prisma.facultyJobPosting.findMany({ where: { collegeId }, select: { id: true } })
    const jobIds = jobs.map(j => j.id)

    const appsThisWeek = await prisma.jobApplication.count({
      where: { jobPostingId: { in: jobIds }, appliedAt: { gte: weekAgo } },
    })

    const totalJobs = jobs.length

    const placementsConfirmed = await prisma.placementRecord.count({
      where: { collegeId },
    })

    // Top skill gaps across students
    const topGaps = await prisma.skillGap.groupBy({
      by: ['missingSkill'],
      where: { closed: false },
      _count: { missingSkill: true },
      orderBy: { _count: { missingSkill: 'desc' } },
      take: 5,
    })

    return ok({
      totalStudents,
      avgReadiness: Math.round(avgReadiness._avg.readinessScore ?? 0),
      applicationsThisWeek: appsThisWeek,
      activeJobs: totalJobs,
      placementsConfirmed,
      topGaps: topGaps.map(g => ({ skill: g.missingSkill, count: g._count.missingSkill })),
    })
  } catch (err) {
    console.error('[faculty/analytics GET]', err)
    return serverError()
  }
}
