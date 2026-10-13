export const dynamic = 'force-dynamic'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { studentTracker } from '@/lib/placement'

// GET /api/tracker — every application with its round-by-round progress
export async function GET() {
  try {
    const user = (await auth())?.user as { id?: string; role?: string } | undefined
    if (!user?.id || user.role !== 'STUDENT') return unauthorized()
    return ok({ applications: await studentTracker(user.id) })
  } catch (err) {
    console.error('[tracker GET]', err)
    return serverError()
  }
}
