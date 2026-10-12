import { auth } from '@/auth'
import { ok, unauthorized, serverError, aiFailure } from '@/lib/api'
import { processOpenClawAgent } from '@/lib/openclaw/agent'

// Discovery + scoring + résumé tailoring for up to `dailyLimit` jobs
export const maxDuration = 300

// POST /api/openclaw/trigger — run the assisted-apply agent now for the signed-in student.
// The nightly worker (workers/index.ts) runs the same agent for every active config.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const result = await processOpenClawAgent(session.user.id)
    const messages: Record<typeof result.status, string> = {
      completed: result.prepared > 0
        ? `${result.prepared} application${result.prepared === 1 ? '' : 's'} ready for you to review and submit.`
        : 'No new strong matches right now. Try widening your target roles or cities.',
      inactive: 'Activate OpenClaw and save your preferences first.',
      no_sources: 'Job discovery is not configured on this server.',
      limit_reached: 'Daily limit reached — review your ready applications.',
    }
    return ok({ ...result, message: messages[result.status] })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[openclaw/trigger]', err)
    return serverError()
  }
}
