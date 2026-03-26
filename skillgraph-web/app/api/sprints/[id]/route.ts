import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, badRequest, serverError, ok } from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const { dayIndex } = body // 0-based day index that was checked

    const sprint = await prisma.sprint.findUnique({ where: { id } })
    if (!sprint || sprint.userId !== session.user.id) return badRequest('Sprint not found')

    // completion_percentage = (checked days / 7) * 100
    // We store completedDays as a number field approach:
    // Recalculate from dayIndex: assume front-end sends completed count
    const completedCount = typeof body.completedCount === 'number' ? body.completedCount : null
    const percentage = completedCount !== null ? Math.round((completedCount / 7) * 100) : sprint.completionPercentage

    const updateData: {
      completionPercentage: number;
      status?: string;
      completedAt?: Date;
    } = { completionPercentage: percentage }

    if (percentage >= 100) {
      updateData.status = 'completed'
      updateData.completedAt = new Date()

      // Increment user streak
      await prisma.user.update({
        where: { id: session.user.id },
        data: { sprintsCompleted: { increment: 1 } },
      })
    }

    const updated = await prisma.sprint.update({ where: { id }, data: updateData })

    return ok({ sprint: updated })
  } catch (err) {
    console.error('[sprints/[id] PATCH]', err)
    return serverError()
  }
}
