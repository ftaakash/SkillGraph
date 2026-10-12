/**
 * Billing & entitlements (ADR-001 Phase 4).
 *
 * Purchases are prepaid periods: checkout creates a `pending` Subscription tied to a Razorpay
 * order; a verified payment (checkout callback or webhook, whichever arrives first) activates it
 * exactly once. Entitlements are derived from currently-effective subscriptions on every check.
 */
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/log'
import { PLANS, priceFor, addMonths, type PlanId, type Plan, type Limits, type OwnerType } from './plans'
import { createOrder, publicKeyId } from './razorpay'

export class BillingError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'BillingError'
  }
}

// ─── Ownership ──────────────────────────────────────────────────────────────

type Buyer = { id: string; role: string; collegeId: string | null; companyId: string | null; isCollegeAdmin: boolean; name: string; email: string }

async function loadBuyer(userId: string): Promise<Buyer> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, collegeId: true, companyId: true, isCollegeAdmin: true, name: true, email: true },
  })
  if (!user) throw new BillingError(401, 'Unauthorized')
  return user
}

/** Which account a plan bought by this user belongs to — or why they can't buy it. */
export function resolveOwner(plan: Plan, buyer: Pick<Buyer, 'id' | 'role' | 'collegeId' | 'companyId' | 'isCollegeAdmin'>): { ownerType: OwnerType; ownerId: string } {
  switch (plan.audience) {
    case 'student':
      if (buyer.role !== 'STUDENT') throw new BillingError(403, 'This plan is for students')
      return { ownerType: 'user', ownerId: buyer.id }
    case 'college':
      if (buyer.role !== 'FACULTY' || !buyer.collegeId) throw new BillingError(403, 'Campus licences are purchased by placement-cell faculty')
      if (!buyer.isCollegeAdmin) throw new BillingError(403, 'Only your college workspace admin can purchase a licence')
      return { ownerType: 'college', ownerId: buyer.collegeId }
    case 'recruiter':
      if (buyer.role !== 'RECRUITER' || !buyer.companyId) throw new BillingError(403, 'Team plans are purchased by recruiters for their company')
      return { ownerType: 'company', ownerId: buyer.companyId }
  }
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export async function startCheckout(userId: string, planId: PlanId, seats?: number) {
  const plan = PLANS[planId]
  const buyer = await loadBuyer(userId)
  const owner = resolveOwner(plan, buyer)

  let amountPaise: number
  try {
    amountPaise = priceFor(planId, seats)
  } catch (err) {
    throw new BillingError(400, (err as Error).message)
  }

  const order = await createOrder({
    amountPaise,
    receipt: `${planId}:${owner.ownerId}`,
    notes: { plan: planId, ownerType: owner.ownerType, ownerId: owner.ownerId, purchasedBy: userId, seats: String(seats ?? '') },
  })

  await prisma.subscription.create({
    data: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      plan: planId,
      seats: plan.perSeat ? seats : null,
      amountPaise,
      providerOrderId: order.id,
      purchasedByUserId: userId,
    },
  })

  return {
    keyId: publicKeyId(),
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    planName: plan.name,
    prefill: { name: buyer.name, email: buyer.email },
  }
}

// ─── Activation (idempotent) ────────────────────────────────────────────────

export async function activateOrder(orderId: string, payment: { id: string; amountPaise: number; method?: string | null }) {
  const sub = await prisma.subscription.findUnique({ where: { providerOrderId: orderId } })
  if (!sub) {
    logger.warn('billing.unknown_order', { orderId })
    return null
  }

  await prisma.payment.upsert({
    where: { providerPaymentId: payment.id },
    update: { status: 'captured' },
    create: { subscriptionId: sub.id, providerPaymentId: payment.id, amountPaise: payment.amountPaise, method: payment.method ?? null, status: 'captured' },
  })

  if (sub.status === 'active') return sub
  if (payment.amountPaise !== sub.amountPaise) {
    logger.error('billing.amount_mismatch', { orderId, expected: sub.amountPaise, paid: payment.amountPaise })
    await prisma.subscription.updateMany({ where: { id: sub.id, status: 'pending' }, data: { status: 'failed' } })
    return null
  }

  // Renewals bought early start when the current period ends
  const latest = await prisma.subscription.findFirst({
    where: { ownerType: sub.ownerType, ownerId: sub.ownerId, plan: sub.plan, status: 'active', periodEnd: { gt: new Date() } },
    orderBy: { periodEnd: 'desc' },
    select: { periodEnd: true },
  })
  const periodStart = latest?.periodEnd && latest.periodEnd > new Date() ? latest.periodEnd : new Date()
  const periodEnd = addMonths(periodStart, PLANS[sub.plan as PlanId].periodMonths)

  // Only one concurrent activation (checkout callback vs webhook) can claim the pending row
  const claimed = await prisma.subscription.updateMany({
    where: { id: sub.id, status: 'pending' },
    data: { status: 'active', periodStart, periodEnd },
  })
  if (claimed.count === 1) {
    forgetEntitlements()
    logger.info('billing.activated', { subscriptionId: sub.id, plan: sub.plan, ownerType: sub.ownerType, periodEnd })
  }
  return prisma.subscription.findUnique({ where: { id: sub.id } })
}

export async function markPaymentFailed(orderId: string, paymentId: string, amountPaise: number) {
  const sub = await prisma.subscription.findUnique({ where: { providerOrderId: orderId }, select: { id: true } })
  if (!sub) return
  await prisma.payment.upsert({
    where: { providerPaymentId: paymentId },
    update: {},
    create: { subscriptionId: sub.id, providerPaymentId: paymentId, amountPaise, status: 'failed' },
  })
}

// ─── Entitlements ───────────────────────────────────────────────────────────

export interface Entitlements {
  plan: PlanId
  /** How the plan applies: bought by the user, via their college licence, their company, or free. */
  source: 'self' | 'college' | 'company' | 'free'
  limits: Limits
  periodEnd: Date | null
}

const CACHE_MS = 30_000
const cache = new Map<string, { value: Entitlements; at: number }>()

export function forgetEntitlements(userId?: string) {
  if (userId) cache.delete(userId)
  else cache.clear()
}

function effective(ownerType: OwnerType, ownerId: string, plan: PlanId) {
  const now = new Date()
  return prisma.subscription.findMany({
    where: { ownerType, ownerId, plan, status: 'active', periodStart: { lte: now }, periodEnd: { gt: now } },
    select: { seats: true, periodEnd: true },
  })
}

const entitled = (plan: PlanId, source: Entitlements['source'], periodEnd: Date | null = null): Entitlements =>
  ({ plan, source, limits: PLANS[plan].limits, periodEnd })

/** True if the student is within the first `seats` students who joined the college. */
export function coveredBySeats(rank: number, seats: number) {
  return rank < seats
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  const value = await computeEntitlements(userId)
  cache.set(userId, { value, at: Date.now() })
  if (cache.size > 10_000) cache.clear()
  return value
}

async function computeEntitlements(userId: string): Promise<Entitlements> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, collegeId: true, companyId: true, collegeJoinedAt: true },
  })
  if (!user) return entitled('student_free', 'free')

  if (user.role === 'RECRUITER') {
    if (user.companyId) {
      const [team] = await effective('company', user.companyId, 'recruiter_team')
      if (team) return entitled('recruiter_team', 'company', team.periodEnd)
    }
    return entitled('recruiter_free', 'free')
  }

  if (user.role === 'FACULTY') {
    if (user.collegeId) {
      const [licence] = await effective('college', user.collegeId, 'college_licence')
      if (licence) return entitled('college_licence', 'college', licence.periodEnd)
    }
    return entitled('student_free', 'free')
  }

  // Student: own Pro first, then their college licence (first `seats` students to join are covered)
  const [own] = await effective('user', userId, 'student_pro')
  if (own) return entitled('student_pro', 'self', own.periodEnd)

  if (user.collegeId && user.collegeJoinedAt) {
    const licences = await effective('college', user.collegeId, 'college_licence')
    const seats = licences.reduce((n, l) => n + (l.seats ?? 0), 0)
    if (seats > 0) {
      const rank = await prisma.user.count({
        where: { role: 'STUDENT', collegeId: user.collegeId, collegeJoinedAt: { lt: user.collegeJoinedAt } },
      })
      if (coveredBySeats(rank, seats)) {
        const periodEnd = licences.map(l => l.periodEnd!).sort((a, b) => b.getTime() - a.getTime())[0]
        return entitled('college_licence', 'college', periodEnd)
      }
    }
  }
  return entitled('student_free', 'free')
}

// ─── Usage (for limits and the billing page) ────────────────────────────────

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export async function revealRequestsThisMonth(recruiterId: string) {
  return prisma.recruiterTalentView.count({
    where: { recruiterId, requestedAt: { gte: startOfMonth() } },
  })
}

export async function billingOverview(userId: string) {
  const user = await loadBuyer(userId)
  const entitlements = await getEntitlements(userId)
  const owners: { ownerType: OwnerType; ownerId: string }[] = [{ ownerType: 'user', ownerId: userId }]
  if (user.role === 'FACULTY' && user.collegeId) owners.push({ ownerType: 'college', ownerId: user.collegeId })
  if (user.role === 'RECRUITER' && user.companyId) owners.push({ ownerType: 'company', ownerId: user.companyId })

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [subscriptions, aiUsage, openclawToday, revealsThisMonth] = await Promise.all([
    prisma.subscription.findMany({
      where: { OR: owners, status: { in: ['active', 'expired'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, plan: true, status: true, seats: true, amountPaise: true, periodStart: true, periodEnd: true, ownerType: true, createdAt: true },
    }),
    prisma.aiUsage.aggregate({ where: { userId, createdAt: { gte: since } }, _sum: { promptTokens: true, completionTokens: true } }),
    user.role === 'STUDENT'
      ? prisma.openClawApplication.count({ where: { userId, status: 'ReadyToApply', appliedAt: { gte: today } } })
      : Promise.resolve(0),
    user.role === 'RECRUITER' ? revealRequestsThisMonth(userId) : Promise.resolve(0),
  ])

  return {
    role: user.role,
    canBuyCollegeLicence: user.role === 'FACULTY' && user.isCollegeAdmin && Boolean(user.collegeId),
    entitlements,
    usage: {
      aiTokens24h: (aiUsage._sum.promptTokens ?? 0) + (aiUsage._sum.completionTokens ?? 0),
      openclawPreparedToday: openclawToday,
      revealRequestsThisMonth: revealsThisMonth,
    },
    subscriptions,
  }
}
