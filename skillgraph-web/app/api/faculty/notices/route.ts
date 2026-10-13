import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { facultyContext, collegeStudents } from '@/lib/tenant'
import { noticeSchema } from '@/lib/placement/validation'
import { notifyUsers } from '@/lib/placement/notify'
import { logger } from '@/lib/log'

// POST /api/faculty/notices — publish a notice to the college's students (and notify them)
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()
    const parsed = noticeSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid notice')
    const { title, body, category, jobPostingId } = parsed.data

    if (jobPostingId) {
      const job = await prisma.facultyJobPosting.findFirst({ where: { id: jobPostingId, collegeId: ctx.collegeId }, select: { id: true } })
      if (!job) return badRequest('That drive is not in your college')
    }
    const notice = await prisma.notice.create({
      data: { collegeId: ctx.collegeId, authorId: userId, title, body, category, jobPostingId: jobPostingId ?? null },
    })
    // The author has read their own notice
    await prisma.noticeRead.create({ data: { noticeId: notice.id, userId } })

    const students = await prisma.user.findMany({ where: collegeStudents(ctx.collegeId), select: { id: true } })
    await notifyUsers(students.map(s => s.id), {
      type: 'system',
      title: `Notice: ${title}`,
      body: body.slice(0, 280),
      link: `/notices?id=${notice.id}`,
    })
    logger.info('placement.notice_published', { userId, collegeId: ctx.collegeId, noticeId: notice.id, recipients: students.length })
    return ok({ notice })
  } catch (err) {
    console.error('[faculty/notices POST]', err)
    return serverError()
  }
}
