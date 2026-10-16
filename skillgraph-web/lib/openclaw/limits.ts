/**
 * The plan's daily OpenClaw allowance (lib/billing/plans.ts → openclawPerDay), counted as job-tailored
 * résumés generated today. Shared by the browser extension and "Tailor CV"; the nightly agent
 * applies the same plan limit to what it prepares or submits.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEntitlements } from '@/lib/billing'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** A 402 response when today's allowance is used up, otherwise null. */
export async function tailoringLimitReached(userId: string): Promise<NextResponse | null> {
  const [{ limits, plan }, usedToday] = await Promise.all([
    getEntitlements(userId),
    prisma.resumeVersion.count({ where: { userId, generatedBy: 'AI', createdAt: { gte: startOfToday() } } }),
  ])
  if (usedToday < limits.openclawPerDay) return null
  return NextResponse.json(
    {
      error: plan === 'student_free'
        ? `You've tailored ${usedToday} résumés today, the Free plan's daily limit. Upgrade to Pro on the Billing page for more.`
        : `Daily limit of ${limits.openclawPerDay} tailored résumés reached. It resets at midnight.`,
      code: 'plan_limit',
    },
    { status: 402 },
  )
}
