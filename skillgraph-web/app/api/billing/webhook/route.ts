import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { activateOrder, markPaymentFailed } from '@/lib/billing'
import { verifyWebhookSignature } from '@/lib/billing/razorpay'
import { logger } from '@/lib/log'

type PaymentEntity = { id: string; order_id: string; amount: number; method?: string; status?: string }
type WebhookBody = { event: string; payload?: { payment?: { entity?: PaymentEntity } } }

// POST /api/billing/webhook — Razorpay server-to-server events (public; authenticated by signature)
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  if (!verifyWebhookSignature(raw, signature)) {
    logger.warn('billing.webhook_bad_signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let body: WebhookBody
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Razorpay retries deliveries; record the event id first so each event is processed once
  const eventId = req.headers.get('x-razorpay-event-id') ?? `${body.event}:${body.payload?.payment?.entity?.id ?? raw.length}`
  try {
    await prisma.webhookEvent.create({ data: { id: eventId, provider: 'razorpay', type: body.event } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return NextResponse.json({ ok: true, duplicate: true })
    throw err
  }

  try {
    const payment = body.payload?.payment?.entity
    if (payment?.order_id) {
      if (body.event === 'payment.captured' || body.event === 'order.paid') {
        await activateOrder(payment.order_id, { id: payment.id, amountPaise: payment.amount, method: payment.method })
      } else if (body.event === 'payment.failed') {
        await markPaymentFailed(payment.order_id, payment.id, payment.amount)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    // Let Razorpay retry: forget the event so the retry is processed
    await prisma.webhookEvent.delete({ where: { id: eventId } }).catch(() => {})
    logger.error('billing.webhook_failed', { event: body.event, err })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
