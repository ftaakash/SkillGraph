import { auth } from '@/auth'
import { ok, unauthorized, serverError, aiFailure } from '@/lib/api'
import { processOpenClawAgent } from '@/lib/openclaw/agent'

// Discovery, filtering, scoring, résumé tailoring and (opt-in, partner employers) submission for up to `dailyLimit` jobs
export const maxDuration = 300

// POST /api/openclaw/trigger — run the apply agent now for the signed-in student.
// The nightly worker (workers/index.ts) runs the same agent for every active config.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const result = await processOpenClawAgent(session.user.id)
    const messages: Record<typeof result.status, string> = {
      completed: result.prepared + result.submitted > 0
        ? [
            result.submitted ? `${result.submitted} submitted through the employer’s application system` : null,
            result.prepared ? `${result.prepared} ready for you to submit` : null,
          ].filter(Boolean).join(', ') + '. Each has a résumé tailored to the job.'
        : result.skipped.filtered > 0 && result.evaluated === 0
          ? 'No new jobs matched your filters. Try widening your roles, cities or keywords.'
          : 'No new strong matches right now. Try widening your target roles or cities.',
      inactive: 'Turn on Smart Apply and save your preferences first.',
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
