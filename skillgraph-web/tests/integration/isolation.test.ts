/**
 * Database integration tests for tenant isolation, entitlements and billing (ADR-001 Phase 4).
 * Requires TEST_DATABASE_URL pointing at a disposable local Postgres with migrations applied:
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillgraph_test npm run test:integration
 * Every test creates uniquely named rows and removes them afterwards.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { joinCollege, studentCollegeId, facultyContext, facultyCanManageApplication, campusApplyBlocker, collegeStudents, generateCode } from '@/lib/tenant'
import { activateOrder, getEntitlements, forgetEntitlements } from '@/lib/billing'
import { PLANS } from '@/lib/billing/plans'
import { POST as webhook } from '@/app/api/billing/webhook/route'

const url = process.env.TEST_DATABASE_URL
const safe = Boolean(url && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(url))
const skip = !safe && 'set TEST_DATABASE_URL to a local disposable database to run integration tests'

const run = randomUUID().slice(0, 8)
const ids = { users: [] as string[], colleges: [] as string[], jobs: [] as string[], subs: [] as string[] }

async function user(role: 'STUDENT' | 'FACULTY' | 'RECRUITER', extra: Record<string, unknown> = {}) {
  const u = await prisma.user.create({
    data: { name: `${role} ${run}`, email: `${role.toLowerCase()}-${randomUUID()}@test.local`, passwordHash: 'x', role, ...extra },
  })
  ids.users.push(u.id)
  return u
}

async function college(name: string) {
  const c = await prisma.collegeInstitution.create({
    data: { name: `${name} ${run}`, city: 'Test', state: 'TS', tier: 'Tier-1', tpContactEmail: 'tp@test.local', joinCode: generateCode(), facultyInviteCode: generateCode(10) },
  })
  ids.colleges.push(c.id)
  return c
}

async function job(collegeId: string, deadline: Date) {
  const j = await prisma.facultyJobPosting.create({
    data: { collegeId, title: `Job ${run}`, company: 'Acme', description: 'x', deadline },
  })
  ids.jobs.push(j.id)
  return j
}

async function pendingSub(data: { ownerType: string; ownerId: string; plan: keyof typeof PLANS; seats?: number; amountPaise: number; buyer: string }) {
  const s = await prisma.subscription.create({
    data: { ownerType: data.ownerType, ownerId: data.ownerId, plan: data.plan, seats: data.seats, amountPaise: data.amountPaise, providerOrderId: `order_${randomUUID()}`, purchasedByUserId: data.buyer },
  })
  ids.subs.push(s.id)
  return s
}

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
const past = new Date(Date.now() - 24 * 60 * 60 * 1000)

describe('integration: tenant isolation, entitlements, billing', { skip }, () => {
  let A: Awaited<ReturnType<typeof college>>, B: Awaited<ReturnType<typeof college>>
  let facultyA: Awaited<ReturnType<typeof user>>, a1: Awaited<ReturnType<typeof user>>, a2: Awaited<ReturnType<typeof user>>, b1: Awaited<ReturnType<typeof user>>

  before(async () => {
    A = await college('College A')
    B = await college('College B')
    facultyA = await user('FACULTY', { collegeId: A.id, isCollegeAdmin: true })
    a1 = await user('STUDENT')
    a2 = await user('STUDENT')
    b1 = await user('STUDENT')
  })

  after(async () => {
    await prisma.payment.deleteMany({ where: { subscriptionId: { in: ids.subs } } })
    await prisma.subscription.deleteMany({ where: { id: { in: ids.subs } } })
    await prisma.jobApplication.deleteMany({ where: { jobPostingId: { in: ids.jobs } } })
    await prisma.facultyJobPosting.deleteMany({ where: { id: { in: ids.jobs } } })
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
    await prisma.collegeInstitution.deleteMany({ where: { id: { in: ids.colleges } } })
    await prisma.webhookEvent.deleteMany({ where: { id: { startsWith: `evt_${run}` } } })
    await prisma.$disconnect()
  })

  test('students join only with a valid code, and membership is read from the database', async () => {
    assert.equal(await joinCollege(a1.id, 'NOTACODE'), null)
    assert.equal((await joinCollege(a1.id, A.joinCode!.toLowerCase()))?.id, A.id)
    await new Promise(r => setTimeout(r, 5)) // distinct join timestamps for seat ordering
    assert.equal((await joinCollege(a2.id, A.joinCode!))?.id, A.id)
    assert.equal((await joinCollege(b1.id, B.joinCode!))?.id, B.id)
    assert.equal(await studentCollegeId(a1.id), A.id)
    assert.equal(await studentCollegeId(facultyA.id), null)
  })

  test('faculty see only their own college', async () => {
    const ctx = await facultyContext(facultyA.id)
    assert.equal(ctx?.collegeId, A.id)
    assert.equal(await facultyContext(a1.id), null)

    const ownStudents = await prisma.user.findMany({ where: collegeStudents(A.id), select: { id: true } })
    assert.deepEqual(new Set(ownStudents.map(s => s.id)), new Set([a1.id, a2.id]))

    const jobA = await job(A.id, future)
    const jobB = await job(B.id, future)
    const appA = await prisma.jobApplication.create({ data: { userId: a1.id, jobPostingId: jobA.id } })
    const appB = await prisma.jobApplication.create({ data: { userId: b1.id, jobPostingId: jobB.id } })
    assert.equal(await facultyCanManageApplication(ctx!, appA.id), true)
    assert.equal(await facultyCanManageApplication(ctx!, appB.id), false)
    assert.equal(await facultyCanManageApplication(ctx!, 'missing'), false)
  })

  test('students can apply only to open jobs at their own college', async () => {
    const open = await job(A.id, future)
    const closed = await job(A.id, past)
    const other = await job(B.id, future)
    assert.equal(await campusApplyBlocker(a1.id, open.id), null)
    assert.equal(await campusApplyBlocker(a1.id, closed.id), 'Applications for this job have closed')
    assert.equal(await campusApplyBlocker(a1.id, other.id), 'Job not found')
    assert.equal(await campusApplyBlocker(facultyA.id, open.id), 'Job not found')
  })

  test('a college licence covers students in join order up to the seat count', async () => {
    forgetEntitlements()
    assert.equal((await getEntitlements(a1.id)).plan, 'student_free')

    const sub = await pendingSub({ ownerType: 'college', ownerId: A.id, plan: 'college_licence', seats: 1, amountPaise: PLANS.college_licence.pricePaise, buyer: facultyA.id })
    const payment = { id: `pay_${randomUUID()}`, amountPaise: sub.amountPaise }
    // Checkout callback and webhook racing: exactly one activation
    const [r1, r2] = await Promise.all([activateOrder(sub.providerOrderId, payment), activateOrder(sub.providerOrderId, payment)])
    assert.equal(r1?.status, 'active')
    assert.equal(r2?.status, 'active')
    assert.equal(await prisma.payment.count({ where: { subscriptionId: sub.id } }), 1)

    forgetEntitlements()
    const first = await getEntitlements(a1.id)
    assert.equal(first.plan, 'college_licence')
    assert.equal(first.source, 'college')
    assert.equal((await getEntitlements(a2.id)).plan, 'student_free') // joined second, only 1 seat
    assert.equal((await getEntitlements(b1.id)).plan, 'student_free') // other college
    assert.equal((await getEntitlements(facultyA.id)).plan, 'college_licence')
  })

  test('an early renewal starts when the current period ends', async () => {
    const first = await pendingSub({ ownerType: 'user', ownerId: a2.id, plan: 'student_pro', amountPaise: PLANS.student_pro.pricePaise, buyer: a2.id })
    const active = await activateOrder(first.providerOrderId, { id: `pay_${randomUUID()}`, amountPaise: first.amountPaise })
    const renewal = await pendingSub({ ownerType: 'user', ownerId: a2.id, plan: 'student_pro', amountPaise: PLANS.student_pro.pricePaise, buyer: a2.id })
    const renewed = await activateOrder(renewal.providerOrderId, { id: `pay_${randomUUID()}`, amountPaise: renewal.amountPaise })
    assert.equal(renewed?.periodStart?.getTime(), active?.periodEnd?.getTime())

    forgetEntitlements()
    const ent = await getEntitlements(a2.id)
    assert.equal(ent.plan, 'student_pro')
    assert.equal(ent.source, 'self')
  })

  test('a payment for the wrong amount never activates a plan', async () => {
    const sub = await pendingSub({ ownerType: 'user', ownerId: b1.id, plan: 'student_pro', amountPaise: PLANS.student_pro.pricePaise, buyer: b1.id })
    assert.equal(await activateOrder(sub.providerOrderId, { id: `pay_${randomUUID()}`, amountPaise: 100 }), null)
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } }))?.status, 'failed')
    forgetEntitlements()
    assert.equal((await getEntitlements(b1.id)).plan, 'student_free')
  })

  test('webhooks require a valid signature and are processed once', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'wh_test_secret'
    const sub = await pendingSub({ ownerType: 'user', ownerId: b1.id, plan: 'student_pro', amountPaise: PLANS.student_pro.pricePaise, buyer: b1.id })
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_${randomUUID()}`, order_id: sub.providerOrderId, amount: sub.amountPaise, method: 'upi' } } },
    })
    const send = (signature: string) =>
      webhook(new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        body,
        headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': `evt_${run}_1` },
      }))

    assert.equal((await send('bad')).status, 400)
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } }))?.status, 'pending')

    const sig = createHmac('sha256', 'wh_test_secret').update(body).digest('hex')
    const first = await send(sig)
    assert.equal(first.status, 200)
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } }))?.status, 'active')

    const again = await (await send(sig)).json()
    assert.equal(again.duplicate, true)
    assert.equal(await prisma.payment.count({ where: { subscriptionId: sub.id } }), 1)
  })
})
