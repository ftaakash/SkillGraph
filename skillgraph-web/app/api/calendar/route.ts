export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { calendarEvents } from '@/lib/placement'

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000

// GET /api/calendar?from=ISO&to=ISO — placement rounds, visits and deadlines (at most ~2 months per request)
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const from = new Date(req.nextUrl.searchParams.get('from') ?? '')
    const to = new Date(req.nextUrl.searchParams.get('to') ?? '')
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return badRequest('from and to must be dates, with from before to')
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) return badRequest('Ask for at most two months at a time')
    return ok({ events: await calendarEvents(userId, from, to) })
  } catch (err) {
    console.error('[calendar GET]', err)
    return serverError()
  }
}
