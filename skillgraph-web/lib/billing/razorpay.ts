/**
 * Minimal Razorpay REST client (Orders API + signature verification). No SDK dependency.
 * Docs: https://razorpay.com/docs/api/orders/ · https://razorpay.com/docs/webhooks/validate-test/
 */
import { createHmac, timingSafeEqual } from 'crypto'

const API = 'https://api.razorpay.com/v1'

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function publicKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? ''
}

function authHeader() {
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  return `Basic ${token}`
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
}

/** Creates an order; the amount is always computed server-side from the plan catalogue. */
export async function createOrder(input: {
  amountPaise: number
  receipt: string
  notes: Record<string, string>
}): Promise<RazorpayOrder> {
  if (!razorpayConfigured()) throw new Error('Razorpay is not configured')
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt.slice(0, 40), notes: input.notes }),
    signal: AbortSignal.timeout(10_000),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${body?.error?.description ?? 'unknown error'}`)
  return body as RazorpayOrder
}

function hmacHex(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Checkout callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? '') {
  if (!secret || !orderId || !paymentId || !signature) return false
  return safeEqualHex(hmacHex(secret, `${orderId}|${paymentId}`), signature)
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '') {
  if (!secret || !signature) return false
  return safeEqualHex(hmacHex(secret, rawBody), signature)
}
