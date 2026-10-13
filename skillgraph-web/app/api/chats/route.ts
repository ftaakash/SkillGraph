export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, serverError } from '@/lib/api'

// GET /api/chats — drive chats the user can open: drives they applied to (students) or their college's drives (faculty)
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true } })
    if (!user?.collegeId || (user.role !== 'STUDENT' && user.role !== 'FACULTY')) return ok({ chats: [] })

    const jobIds =
      user.role === 'STUDENT'
        ? (await prisma.jobApplication.findMany({ where: { userId }, select: { jobPostingId: true } })).map(a => a.jobPostingId)
        : undefined
    const jobs = await prisma.facultyJobPosting.findMany({
      where: { collegeId: user.collegeId, ...(jobIds ? { id: { in: jobIds } } : {}) },
      select: {
        id: true, title: true, company: true, createdAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, deletedAt: true, createdAt: true, user: { select: { name: true } } },
        },
      },
      take: 200,
    })
    const chats = jobs
      .map(j => {
        const last = j.messages[0]
        return {
          jobId: j.id,
          title: `${j.company} · ${j.title}`,
          last: last ? { author: last.user.name, body: last.deletedAt ? null : last.body.slice(0, 120), at: last.createdAt } : null,
          activityAt: last?.createdAt ?? j.createdAt,
        }
      })
      .sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime())
    return ok({ chats })
  } catch (err) {
    console.error('[chats GET]', err)
    return serverError()
  }
}
