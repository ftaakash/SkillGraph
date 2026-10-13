import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { facultyRound, newAttendanceCode } from '@/lib/placement/faculty'
import { roundPatchSchema } from '@/lib/placement/validation'
import { logger } from '@/lib/log'

const notFound = () => NextResponse.json({ error: 'Round not found' }, { status: 404 })

// PATCH /api/faculty/rounds/:id — edit a round, or open / close its check-in window
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyRound(userId, id)
    if (!found) return notFound()
    const parsed = roundPatchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')
    const body = parsed.data

    const data =
      body.action === 'open_attendance'
        ? { attendanceCode: newAttendanceCode(), attendanceUntil: new Date(Date.now() + body.minutes * 60_000) }
        : body.action === 'close_attendance'
          ? { attendanceCode: null, attendanceUntil: null }
          : body.round
    const round = await prisma.driveRound.update({ where: { id }, data })
    if (body.action === 'open_attendance') logger.info('placement.attendance_opened', { userId, roundId: id, minutes: body.minutes })
    return ok({ round })
  } catch (err) {
    console.error('[faculty/rounds/:id PATCH]', err)
    return serverError()
  }
}

// DELETE /api/faculty/rounds/:id — remove a round (and its results); later rounds move up
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyRound(userId, id)
    if (!found) return notFound()
    const { round } = found
    await prisma.$transaction([
      prisma.driveRound.delete({ where: { id } }),
      prisma.driveRound.updateMany({
        where: { jobPostingId: round.jobPostingId, position: { gt: round.position } },
        data: { position: { decrement: 1 } },
      }),
    ])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[faculty/rounds/:id DELETE]', err)
    return serverError()
  }
}
