import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { facultyRound } from '@/lib/placement/faculty'
import { resultsSchema } from '@/lib/placement/validation'
import { notifyUsers } from '@/lib/placement/notify'

// POST /api/faculty/rounds/:id/results — record outcomes and/or attendance for applicants, in bulk
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyRound(userId, id)
    if (!found) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    const parsed = resultsSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')
    const { applicationIds, outcome, attended } = parsed.data

    // Only applications to this round's drive
    const applications = await prisma.jobApplication.findMany({
      where: { id: { in: applicationIds }, jobPostingId: found.round.jobPostingId },
      select: { id: true, userId: true },
    })
    if (applications.length !== new Set(applicationIds).size) return badRequest('Some applicants are not part of this drive')

    const now = new Date()
    const fields = {
      ...(outcome ? { outcome } : {}),
      ...(attended === true ? { attendedAt: now, attendanceMethod: 'manual' } : {}),
      ...(attended === false ? { attendedAt: null, attendanceMethod: null } : {}),
    }
    await prisma.$transaction(
      applications.map(a =>
        prisma.roundResult.upsert({
          where: { roundId_applicationId: { roundId: id, applicationId: a.id } },
          create: { roundId: id, applicationId: a.id, ...fields },
          update: fields,
        }),
      ),
    )

    if (outcome === 'cleared' || outcome === 'rejected') {
      const job = await prisma.facultyJobPosting.findUnique({ where: { id: found.round.jobPostingId }, select: { title: true, company: true } })
      if (job) {
        await notifyUsers(applications.map(a => a.userId), {
          type: outcome === 'cleared' ? 'shortlisted' : 'status_changed',
          title: `${job.company}: ${found.round.name} result`,
          body: outcome === 'cleared'
            ? `You cleared ${found.round.name} for ${job.title}.`
            : `You were not selected after ${found.round.name} for ${job.title}. Keep going!`,
          link: '/tracker',
        })
      }
    }
    return ok({ updated: applications.length })
  } catch (err) {
    console.error('[faculty/rounds/:id/results POST]', err)
    return serverError()
  }
}
