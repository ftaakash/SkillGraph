import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { PLANS, priceFor, addMonths, isPlanId, PURCHASABLE } from '@/lib/billing/plans'
import { resolveOwner, coveredBySeats, BillingError } from '@/lib/billing'
import { verifyPaymentSignature, verifyWebhookSignature } from '@/lib/billing/razorpay'
import { generateCode, normaliseCode } from '@/lib/tenant'
import { cached } from '@/lib/cache'

test('checkout amounts come only from the plan catalogue', () => {
  assert.equal(priceFor('student_pro'), PLANS.student_pro.pricePaise)
  assert.equal(priceFor('college_licence', 120), PLANS.college_licence.pricePaise * 120)
  assert.throws(() => priceFor('college_licence', 10), /Seats must be/)
  assert.throws(() => priceFor('college_licence', 50.5), /Seats must be/)
  assert.throws(() => priceFor('college_licence'), /Seats must be/)
  assert.throws(() => priceFor('student_free'), /not purchasable/)
  for (const id of PURCHASABLE) assert.ok(PLANS[id].pricePaise > 0 && PLANS[id].periodMonths > 0, id)
  assert.equal(isPlanId('student_pro'), true)
  assert.equal(isPlanId('nope'), false)
  assert.equal(isPlanId('toString'), false) // prototype keys are not plans
})

test('paid plans always grant at least the free limits', () => {
  for (const key of ['aiTokensPerDay', 'openclawPerDay'] as const) {
    assert.ok(PLANS.student_pro.limits[key] >= PLANS.student_free.limits[key], key)
    assert.ok(PLANS.college_licence.limits[key] >= PLANS.student_free.limits[key], key)
  }
  assert.ok(PLANS.recruiter_team.limits.revealRequestsPerMonth > PLANS.recruiter_free.limits.revealRequestsPerMonth)
})

test('only the right role can buy each plan, for the right owner', () => {
  const student = { id: 'u1', role: 'STUDENT', collegeId: 'c1', companyId: null, isCollegeAdmin: false }
  const admin = { id: 'u2', role: 'FACULTY', collegeId: 'c1', companyId: null, isCollegeAdmin: true }
  const faculty = { ...admin, id: 'u3', isCollegeAdmin: false }
  const recruiter = { id: 'u4', role: 'RECRUITER', collegeId: null, companyId: 'co1', isCollegeAdmin: false }

  assert.deepEqual(resolveOwner(PLANS.student_pro, student), { ownerType: 'user', ownerId: 'u1' })
  assert.deepEqual(resolveOwner(PLANS.college_licence, admin), { ownerType: 'college', ownerId: 'c1' })
  assert.deepEqual(resolveOwner(PLANS.recruiter_team, recruiter), { ownerType: 'company', ownerId: 'co1' })

  const denied = (fn: () => unknown) => assert.throws(fn, (e: unknown) => e instanceof BillingError && e.status === 403)
  denied(() => resolveOwner(PLANS.college_licence, faculty)) // not the workspace admin
  denied(() => resolveOwner(PLANS.college_licence, student))
  denied(() => resolveOwner(PLANS.student_pro, recruiter))
  denied(() => resolveOwner(PLANS.recruiter_team, { ...recruiter, companyId: null }))
})

test('Razorpay signatures are verified with the documented HMAC scheme', () => {
  const secret = 'test_secret'
  const sig = createHmac('sha256', secret).update('order_1|pay_1').digest('hex')
  assert.equal(verifyPaymentSignature('order_1', 'pay_1', sig, secret), true)
  assert.equal(verifyPaymentSignature('order_1', 'pay_2', sig, secret), false)
  assert.equal(verifyPaymentSignature('order_1', 'pay_1', sig.slice(0, -1), secret), false)
  assert.equal(verifyPaymentSignature('order_1', 'pay_1', sig, ''), false)

  const body = JSON.stringify({ event: 'payment.captured' })
  const webhookSig = createHmac('sha256', 'wh_secret').update(body).digest('hex')
  assert.equal(verifyWebhookSignature(body, webhookSig, 'wh_secret'), true)
  assert.equal(verifyWebhookSignature(body + ' ', webhookSig, 'wh_secret'), false)
  assert.equal(verifyWebhookSignature(body, webhookSig, ''), false)
})

test('seat coverage follows join order', () => {
  assert.equal(coveredBySeats(0, 1), true)
  assert.equal(coveredBySeats(1, 1), false)
  assert.equal(coveredBySeats(49, 50), true)
  assert.equal(coveredBySeats(0, 0), false)
})

test('renewal periods add calendar months', () => {
  assert.equal(addMonths(new Date('2026-01-15T00:00:00Z'), 12).toISOString().slice(0, 10), '2027-01-15')
})

test('workspace codes are unambiguous and normalised', () => {
  const codes = new Set(Array.from({ length: 500 }, () => generateCode()))
  assert.ok(codes.size > 495, 'codes should be effectively unique')
  for (const code of codes) assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
  assert.equal(generateCode(10).length, 10)
  assert.equal(normaliseCode(' 7kq2-mx4p '), '7KQ2MX4P')
})

test('cache shares one computation between concurrent misses', async () => {
  let calls = 0
  const compute = async () => { calls++; await new Promise(r => setTimeout(r, 20)); return 42 }
  const results = await Promise.all(Array.from({ length: 10 }, () => cached('test:dedupe', 60_000, compute)))
  assert.deepEqual(new Set(results), new Set([42]))
  assert.equal(calls, 1)
  assert.equal(await cached('test:dedupe', 60_000, compute), 42)
  assert.equal(calls, 1)
})
