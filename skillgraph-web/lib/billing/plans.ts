/**
 * Plan catalogue (ADR-001 Phase 4, B2B2C model).
 *
 *   Students     free tier, or Pro — bought individually or covered by their college's seat licence
 *   Colleges     annual seat licence; covers students who joined the workspace, up to the seat count
 *   Recruiters   free tier, or a company Team plan
 *
 * Prices are the single source of truth for checkout amounts (never taken from the client).
 * ⚠ Launch prices are placeholders — confirm them, and GST treatment, before going live.
 */

export type PlanId = 'student_free' | 'student_pro' | 'college_licence' | 'recruiter_free' | 'recruiter_team'
export type Audience = 'student' | 'college' | 'recruiter'
export type OwnerType = 'user' | 'college' | 'company'

export interface Limits {
  /** LLM tokens per rolling 24h. */
  aiTokensPerDay: number
  /** Applications OpenClaw may prepare per day. */
  openclawPerDay: number
  /** Identity-reveal requests a recruiter may send per calendar month. */
  revealRequestsPerMonth: number
}

export interface Plan {
  id: PlanId
  name: string
  audience: Audience
  /** Who the subscription belongs to when purchased. */
  ownerType: OwnerType
  /** Price in paise for one period (per seat for seat-based plans). 0 = free. */
  pricePaise: number
  perSeat: boolean
  minSeats?: number
  maxSeats?: number
  periodMonths: number
  limits: Limits
  highlights: string[]
}

const FREE_STUDENT_LIMITS: Limits = { aiTokensPerDay: 50_000, openclawPerDay: 3, revealRequestsPerMonth: 0 }
const PRO_STUDENT_LIMITS: Limits = { aiTokensPerDay: 300_000, openclawPerDay: 25, revealRequestsPerMonth: 0 }

export const PLANS: Record<PlanId, Plan> = {
  student_free: {
    id: 'student_free', name: 'Free', audience: 'student', ownerType: 'user',
    pricePaise: 0, perSeat: false, periodMonths: 0, limits: FREE_STUDENT_LIMITS,
    highlights: ['Gap analysis & 7-day sprints', 'Smart Apply: 3 prepared applications / day', 'Résumé builder'],
  },
  student_pro: {
    id: 'student_pro', name: 'Pro', audience: 'student', ownerType: 'user',
    pricePaise: 199_00, perSeat: false, periodMonths: 1, limits: PRO_STUDENT_LIMITS,
    highlights: ['6× daily AI usage', 'Smart Apply: up to 25 prepared applications / day', 'Priority evaluation & negotiation scripts'],
  },
  college_licence: {
    id: 'college_licence', name: 'Campus Licence', audience: 'college', ownerType: 'college',
    pricePaise: 999_00, perSeat: true, minSeats: 50, maxSeats: 20_000, periodMonths: 12, limits: PRO_STUDENT_LIMITS,
    highlights: ['Pro for every covered student', 'Cohort analytics & placement reports', 'Campus job board'],
  },
  recruiter_free: {
    id: 'recruiter_free', name: 'Free', audience: 'recruiter', ownerType: 'company',
    pricePaise: 0, perSeat: false, periodMonths: 0,
    limits: { aiTokensPerDay: 20_000, openclawPerDay: 0, revealRequestsPerMonth: 5 },
    highlights: ['Anonymous talent search', '5 contact requests / month'],
  },
  recruiter_team: {
    id: 'recruiter_team', name: 'Team', audience: 'recruiter', ownerType: 'company',
    pricePaise: 4_999_00, perSeat: false, periodMonths: 1,
    limits: { aiTokensPerDay: 100_000, openclawPerDay: 0, revealRequestsPerMonth: 200 },
    highlights: ['200 contact requests / month', 'Hiring pipeline for the whole company', 'Campus job postings'],
  },
}

export const PURCHASABLE: PlanId[] = ['student_pro', 'college_licence', 'recruiter_team']

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && Object.hasOwn(PLANS, v)
}

/** Checkout amount in paise for a plan and seat count. Throws on invalid seat counts. */
export function priceFor(planId: PlanId, seats?: number): number {
  const plan = PLANS[planId]
  if (plan.pricePaise === 0) throw new Error(`${planId} is not purchasable`)
  if (!plan.perSeat) return plan.pricePaise
  if (!Number.isInteger(seats) || seats! < (plan.minSeats ?? 1) || seats! > (plan.maxSeats ?? Infinity)) {
    throw new Error(`Seats must be a whole number between ${plan.minSeats} and ${plan.maxSeats}`)
  }
  return plan.pricePaise * seats!
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export const formatInr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100)
