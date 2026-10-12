export const dynamic = 'force-dynamic'
import { getUserId, unauthorized, ok, serverError } from '@/lib/api'
import { billingOverview } from '@/lib/billing'
import { PLANS, PURCHASABLE } from '@/lib/billing/plans'
import { razorpayConfigured } from '@/lib/billing/razorpay'

// GET /api/billing — current plan, usage, purchase history and the plans this user can buy
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const overview = await billingOverview(userId)
    const audience = overview.role === 'RECRUITER' ? 'recruiter' : overview.role === 'FACULTY' ? 'college' : 'student'
    const plans = Object.values(PLANS)
      .filter(p => p.audience === audience || (audience === 'college' && p.id === 'student_free'))
      .map(p => ({ ...p, purchasable: PURCHASABLE.includes(p.id) }))

    return ok({ ...overview, plans, paymentsEnabled: razorpayConfigured() })
  } catch (err) {
    console.error('[billing GET]', err)
    return serverError()
  }
}
