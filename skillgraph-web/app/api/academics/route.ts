export const dynamic = 'force-dynamic'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { academicOverview } from '@/lib/academics/sync'

// GET /api/academics — the student's attendance, marks, timetable and connection status
export async function GET() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    if (!user?.id || user.role !== 'STUDENT') return unauthorized()
    return ok(await academicOverview(user.id))
  } catch (err) {
    console.error('[academics GET]', err)
    return serverError()
  }
}
