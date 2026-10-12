import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, serverError, badRequest } from '@/lib/api'
import { logger } from '@/lib/log'
import { DECLINE_COOLDOWN_MS, findDiscoverableStudent, listShortlist } from '@/lib/talent'

async function recruiterId() {
  const session = await auth()
  return session?.user?.role === 'RECRUITER' && session.user.id ? session.user.id : null
}

const bodySchema = z.object({ studentId: z.string().min(1).max(64) })

// POST /api/recruiter/reveal — ask a shortlisted student to share their identity and contact details
export async function POST(req: NextRequest) {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('studentId is required')
    const { studentId } = parsed.data

    if (!(await findDiscoverableStudent(studentId))) return badRequest('Student has not opted in to recruiter discovery')

    const existing = await prisma.recruiterTalentView.findUnique({
      where: { recruiterId_studentId: { recruiterId: id, studentId } },
    })
    if (existing?.revealStatus === 'accepted') return ok({ revealStatus: 'accepted' })
    if (existing?.revealStatus === 'requested') return ok({ revealStatus: 'requested', message: 'Request already pending' })
    if (existing?.revealStatus === 'declined' && existing.respondedAt && Date.now() - existing.respondedAt.getTime() < DECLINE_COOLDOWN_MS) {
      return NextResponse.json({ error: 'The candidate declined recently. You can ask again after 30 days.' }, { status: 409 })
    }

    const now = new Date()
    await prisma.recruiterTalentView.upsert({
      where: { recruiterId_studentId: { recruiterId: id, studentId } },
      update: { shortlisted: true, revealStatus: 'requested', requestedAt: now, respondedAt: null },
      create: { recruiterId: id, studentId, shortlisted: true, revealStatus: 'requested', requestedAt: now },
    })

    const recruiter = await prisma.user.findUnique({ where: { id }, select: { Company: { select: { name: true } } } })
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'shortlisted',
        title: `${recruiter?.Company?.name ?? 'A recruiter'} wants to connect`,
        body: 'A recruiter shortlisted your anonymous profile and asked to see your name and contact details. Nothing is shared unless you accept.',
        link: '/profile#recruiter-requests',
      },
    }).catch(err => logger.warn('talent.notify_failed', { err }))

    return ok({ revealStatus: 'requested', message: 'Request sent. Contact details are shared only if the candidate accepts.' })
  } catch (err) {
    console.error('[recruiter/reveal POST]', err)
    return serverError()
  }
}

// GET /api/recruiter/reveal — shortlisted candidates with consent status (identity only when accepted)
export async function GET() {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return ok({ shortlisted: await listShortlist(id) })
  } catch (err) {
    console.error('[recruiter/reveal GET]', err)
    return serverError()
  }
}
