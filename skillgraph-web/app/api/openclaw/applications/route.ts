import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError } from '@/lib/api'

// GET /api/openclaw/applications — the student's OpenClaw pipeline with listings, evaluations and stats
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const rows = await prisma.openClawApplication.findMany({
      where: { userId: session.user.id },
      orderBy: { appliedAt: 'desc' },
      take: 50,
      include: { listing: true },
    })
    const evals = await prisma.evaluationResult.findMany({ where: { applicationId: { in: rows.map(a => a.id) } } })
    const evalMap = new Map(evals.map(e => [e.applicationId, e]))
    const applications = rows.map(({ listing, ...app }) => ({ ...app, Listing: listing, EvaluationResult: evalMap.get(app.id) ?? null }))

    // Matches the agent's daily limit (lib/openclaw/agent.ts): prepared, or submitted for the student, today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = rows.filter(a => a.appliedAt >= todayStart)
    const preparedToday = today.filter(a => a.status === 'ReadyToApply').length
    const submittedToday = today.filter(a => a.status === 'Applied' && a.submittedVia === 'ats_api').length

    return ok({
      applications,
      stats: {
        total: rows.length,
        preparedToday,
        submittedToday,
        handledToday: preparedToday + submittedToday,
        readyToApply: rows.filter(a => a.status === 'ReadyToApply').length,
        avgMatchScore: rows.length > 0 ? Math.round(rows.reduce((s, a) => s + (a.matchScore ?? 0), 0) / rows.length) : 0,
      },
    })
  } catch (err) {
    console.error('[openclaw/applications GET]', err)
    return serverError()
  }
}
