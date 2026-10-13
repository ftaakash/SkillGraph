export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { studentParticipation, roundForStudent } from '@/lib/placement'
import { canRespond, attendanceOpen, attendanceCodeMatches } from '@/lib/placement/rounds'
import { logger } from '@/lib/log'

async function studentId() {
  const user = (await auth())?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'STUDENT' ? user.id : null
}

// GET /api/participation — rounds the student is still in, with confirm / check-in availability
export async function GET() {
  try {
    const userId = await studentId()
    if (!userId) return unauthorized()
    return ok({ rounds: await studentParticipation(userId) })
  } catch (err) {
    console.error('[participation GET]', err)
    return serverError()
  }
}

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['confirm', 'decline']), roundId: z.string().min(1).max(40) }),
  z.object({ action: z.literal('check_in'), roundId: z.string().min(1).max(40), code: z.string().min(1).max(20) }),
])

// POST /api/participation — confirm or decline a round, or check in with the code shown at the venue
export async function POST(req: NextRequest) {
  try {
    const userId = await studentId()
    if (!userId) return unauthorized()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('Invalid request')
    const body = parsed.data

    const found = await roundForStudent(userId, body.roundId)
    if (!found) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    if (!found.eligible) return badRequest('You are not part of this round')
    const { round, application } = found
    const key = { roundId_applicationId: { roundId: round.id, applicationId: application.id } }
    const now = new Date()

    if (body.action === 'check_in') {
      if (!attendanceOpen(round, now)) return badRequest('Check-in is not open for this round')
      if (!attendanceCodeMatches(round.attendanceCode!, body.code)) {
        logger.warn('placement.check_in_wrong_code', { userId, roundId: round.id })
        return badRequest('That code is not right. Check the code shown at the venue.')
      }
      const existing = await prisma.roundResult.findUnique({ where: key })
      if (existing?.confirmation === 'declined') return badRequest('You declined this round')
      await prisma.roundResult.upsert({
        where: key,
        create: { roundId: round.id, applicationId: application.id, attendedAt: now, attendanceMethod: 'code', confirmation: 'confirmed', respondedAt: now },
        update: { attendedAt: existing?.attendedAt ?? now, attendanceMethod: existing?.attendanceMethod ?? 'code' },
      })
      return ok({ checkedIn: true })
    }

    if (!canRespond(round, now)) return badRequest('Responses close 15 minutes before the round starts')
    const confirmation = body.action === 'confirm' ? 'confirmed' : 'declined'
    await prisma.roundResult.upsert({
      where: key,
      create: { roundId: round.id, applicationId: application.id, confirmation, respondedAt: now },
      update: { confirmation, respondedAt: now },
    })
    return ok({ confirmation })
  } catch (err) {
    console.error('[participation POST]', err)
    return serverError()
  }
}
