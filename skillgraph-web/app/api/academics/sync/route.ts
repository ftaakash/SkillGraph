import { getUserId, unauthorized, ok, serverError, academicFailure } from '@/lib/api'
import { syncAcademics } from '@/lib/academics/sync'

// POST /api/academics/sync — refresh from the university (at most every 10 minutes)
export async function POST() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    return ok(await syncAcademics(userId))
  } catch (err) {
    return academicFailure(err) ?? (console.error('[academics/sync POST]', err), serverError())
  }
}
