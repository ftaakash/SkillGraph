export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { studentCollegeId } from '@/lib/tenant'
import { applicationProgress } from '@/lib/placement/rounds'
import { publicRound } from '@/lib/placement'

// GET /api/jobs/:id — one drive at the student's college, with its hiring process and the student's progress
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (await auth())?.user as { id?: string; role?: string } | undefined
    if (!user?.id || user.role !== 'STUDENT') return unauthorized()
    const { id } = await params
    const collegeId = await studentCollegeId(user.id)
    const job = collegeId
      ? await prisma.facultyJobPosting.findFirst({
          where: { id, collegeId },
          include: { rounds: { orderBy: { position: 'asc' } } },
        })
      : null
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const application = await prisma.jobApplication.findFirst({
      where: { userId: user.id, jobPostingId: job.id },
      include: { roundResults: true },
    })
    const progress = applicationProgress(job.rounds, application?.roundResults ?? [], application?.status ?? 'Applied')
    const now = new Date()

    return ok({
      job: {
        ...job,
        rounds: undefined,
        isOpen: job.deadline.getTime() >= now.getTime(),
        application: application
          ? { id: application.id, status: application.status, channel: application.channel, appliedAt: application.appliedAt }
          : null,
      },
      rounds: progress.steps.map(s => ({
        ...publicRound(s.round, now),
        // Progress only means something once the student has applied
        state: application ? s.state : null,
        confirmation: s.result?.confirmation ?? null,
        attendedAt: s.result?.attendedAt ?? null,
      })),
      noticeCount: await prisma.notice.count({ where: { jobPostingId: job.id } }),
    })
  } catch (err) {
    console.error('[jobs/:id GET]', err)
    return serverError()
  }
}
