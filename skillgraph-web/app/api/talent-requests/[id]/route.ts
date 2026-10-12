import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { logger } from '@/lib/log'

const bodySchema = z.object({ decision: z.enum(['accept', 'decline', 'revoke']) })

// POST /api/talent-requests/:id — the student accepts, declines, or later revokes a reveal
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('decision must be accept, decline or revoke')
    const { decision } = parsed.data
    const { id } = await params

    const view = await prisma.recruiterTalentView.findUnique({ where: { id } })
    if (!view || view.studentId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed =
      (decision === 'accept' && (view.revealStatus === 'requested' || view.revealStatus === 'declined')) ||
      (decision === 'decline' && view.revealStatus === 'requested') ||
      (decision === 'revoke' && view.revealStatus === 'accepted')
    if (!allowed) return badRequest(`Cannot ${decision} a request that is ${view.revealStatus}`)

    const accepted = decision === 'accept'
    const now = new Date()
    const updated = await prisma.recruiterTalentView.update({
      where: { id },
      data: {
        revealStatus: accepted ? 'accepted' : 'declined',
        respondedAt: now,
        revealedAt: accepted ? now : null,
      },
    })

    if (accepted) {
      await prisma.notification.create({
        data: {
          userId: view.recruiterId,
          type: 'status_changed',
          title: 'A candidate shared their contact details',
          body: 'A shortlisted candidate accepted your request. Their name and contact details are now visible in your shortlist.',
          link: '/recruiter/shortlist',
        },
      }).catch(err => logger.warn('talent.notify_failed', { err }))
    }

    return ok({ id: updated.id, status: updated.revealStatus })
  } catch (err) {
    console.error('[talent-requests POST]', err)
    return serverError()
  }
}
