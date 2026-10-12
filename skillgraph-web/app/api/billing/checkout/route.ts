import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { startCheckout, BillingError } from '@/lib/billing'
import { PURCHASABLE, type PlanId } from '@/lib/billing/plans'
import { razorpayConfigured } from '@/lib/billing/razorpay'

const bodySchema = z.object({
  plan: z.enum(PURCHASABLE as [PlanId, ...PlanId[]]),
  seats: z.coerce.number().int().positive().max(20_000).optional(),
})

// POST /api/billing/checkout — create a Razorpay order for a plan; amount comes from the plan catalogue
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    if (!razorpayConfigured()) return NextResponse.json({ error: 'Payments are not enabled yet.' }, { status: 503 })

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Choose a valid plan')

    return ok(await startCheckout(userId, parsed.data.plan, parsed.data.seats))
  } catch (err) {
    if (err instanceof BillingError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[billing/checkout]', err)
    return serverError('Could not start checkout. Please try again.')
  }
}
