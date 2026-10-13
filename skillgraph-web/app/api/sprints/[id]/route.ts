import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, badRequest, serverError, ok } from '@/lib/api'

const SPRINT_DAYS = 7

// `days` is the set of completed day indexes (0-6); `completedCount` is the legacy client shape
const bodySchema = z.union([
  z.object({ days: z.array(z.number().int().min(0).max(SPRINT_DAYS - 1)).max(SPRINT_DAYS) }),
  z.object({ completedCount: z.number().int().min(0).max(SPRINT_DAYS) }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) return unauthorized()
    const userId = session.user.id

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('Send the completed days (0–6)')

    const { id } = await params
    const sprint = await prisma.sprint.findUnique({ where: { id } })
    if (!sprint || sprint.userId !== userId) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    if (sprint.status === 'abandoned') return badRequest('This sprint was replaced by a newer one')

    // Which days are done is kept on each day's task, so the exact days survive a reload
    const done = 'days' in parsed.data
      ? new Set(parsed.data.days)
      : new Set(Array.from({ length: parsed.data.completedCount }, (_, i) => i))
    const tasks = Array.isArray(sprint.dayTasks) ? (sprint.dayTasks as Record<string, unknown>[]) : []
    const dayTasks = tasks.map((task, i) => ({ ...task, done: done.has(i) }))
    const completionPercentage = Math.round((done.size / SPRINT_DAYS) * 100)

    // The completed-sprints counter moves only when the sprint crosses the finish line, either way
    const nowComplete = completionPercentage >= 100
    const wasComplete = sprint.status === 'completed'
    const counter = nowComplete === wasComplete ? null : nowComplete ? { increment: 1 } : { decrement: 1 }

    const [updated] = await prisma.$transaction([
      prisma.sprint.update({
        where: { id },
        data: {
          dayTasks,
          completionPercentage,
          status: nowComplete ? 'completed' : 'active',
          completedAt: nowComplete ? (sprint.completedAt ?? new Date()) : null,
        },
      }),
      ...(counter ? [prisma.user.update({ where: { id: userId }, data: { sprintsCompleted: counter } })] : []),
    ])

    return ok({ sprint: updated })
  } catch (err) {
    console.error('[sprints/[id] PATCH]', err)
    return serverError()
  }
}
