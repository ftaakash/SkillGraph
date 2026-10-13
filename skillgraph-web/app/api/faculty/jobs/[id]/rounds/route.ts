import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { facultyJob } from '@/lib/placement/faculty'
import { roundInputSchema } from '@/lib/placement/validation'
import { notifyUsers } from '@/lib/placement/notify'

const MAX_ROUNDS = 15

// POST /api/faculty/jobs/:id/rounds — add the next round to a drive's hiring process
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyJob(userId, id)
    if (!found) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const parsed = roundInputSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid round')
    const count = await prisma.driveRound.count({ where: { jobPostingId: id } })
    if (count >= MAX_ROUNDS) return badRequest(`A drive can have at most ${MAX_ROUNDS} rounds`)

    const round = await prisma.driveRound.create({ data: { ...parsed.data, jobPostingId: id, position: count + 1 } })

    if (round.startsAt) {
      const applicants = await prisma.jobApplication.findMany({ where: { jobPostingId: id, status: { not: 'Rejected' } }, select: { userId: true } })
      await notifyUsers(applicants.map(a => a.userId), {
        type: 'status_changed',
        title: `${found.job.company}: ${round.name} scheduled`,
        body: `Round ${round.position} for ${found.job.title} is scheduled. Confirm whether you will take part.`,
        link: '/participation',
      })
    }
    return ok({ round })
  } catch (err) {
    console.error('[faculty/jobs/:id/rounds POST]', err)
    return serverError()
  }
}
