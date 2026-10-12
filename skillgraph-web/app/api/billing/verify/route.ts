import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { activateOrder, getEntitlements } from '@/lib/billing'
import { verifyPaymentSignature } from '@/lib/billing/razorpay'
import { logger } from '@/lib/log'

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
})

// POST /api/billing/verify — confirm a Checkout payment. The webhook activates the same order
// independently, so a closed browser tab never loses a payment.
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Invalid payment confirmation')
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      logger.warn('billing.bad_signature', { userId, orderId })
      return badRequest('Payment could not be verified')
    }

    const sub = await prisma.subscription.findUnique({ where: { providerOrderId: orderId }, select: { purchasedByUserId: true, amountPaise: true } })
    if (!sub || sub.purchasedByUserId !== userId) return badRequest('Unknown order')

    // The order amount is fixed server-side and Razorpay charges exactly that amount for the order
    const activated = await activateOrder(orderId, { id: paymentId, amountPaise: sub.amountPaise })
    if (!activated || activated.status !== 'active') return badRequest('Payment could not be applied. Contact support with your payment id.')

    return ok({ subscription: activated, entitlements: await getEntitlements(userId) })
  } catch (err) {
    console.error('[billing/verify]', err)
    return serverError()
  }
}
