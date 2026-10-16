/**
 * OpenClaw apply agent (ADR-001 Phase 2, ADR-004).
 *
 * Finds roles through licensed job APIs, keeps only jobs inside the student's filters, scores
 * fit, and for strong matches builds a résumé tailored to that job. Then:
 *  - if the student turned on auto-submit and the employer has authorised SkillGraph's ATS
 *    integration (lib/openclaw/submit.ts), the application is submitted and marked `Applied`;
 *  - otherwise it is queued as `ReadyToApply` for the student to submit (browser extension or by hand).
 * The agent never logs in to job sites and never stores third-party credentials or cookies.
 */
import type { JobListing } from '@/lib/jobs'
import { discoverJobs, discoveryConfigured } from '@/lib/jobs'
import { prisma } from '@/lib/prisma'
import { createTailoredResume } from '@/lib/resume/tailor'
import { scoreJobMatch } from './matcher'
import { OPEN_STATUSES } from './status'
import { checkFilters, filtersFromConfig } from './filters'
import { submitThroughAts, type Applicant } from './submit'
import { getEntitlements } from '@/lib/billing'

const MIN_MATCH_SCORE = 65

export type AgentRunResult = {
  status: 'completed' | 'inactive' | 'no_sources' | 'limit_reached'
  discovered: number
  evaluated: number
  prepared: number
  submitted: number
  skipped: { duplicate: number; filtered: number; lowMatch: number; failed: number }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** `deadline` (epoch ms): stop evaluating new jobs after it — scheduled runs have a time limit. */
export async function processOpenClawAgent(userId: string, opts: { deadline?: number } = {}): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    status: 'completed',
    discovered: 0,
    evaluated: 0,
    prepared: 0,
    submitted: 0,
    skipped: { duplicate: 0, filtered: 0, lowMatch: 0, failed: 0 },
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { OpenClawConfig: true, skills: { select: { skillName: true } } },
  })
  const config = user?.OpenClawConfig
  if (!user || !config || !config.isActive) return { ...result, status: 'inactive' }
  if (!discoveryConfigured()) return { ...result, status: 'no_sources' }

  // The daily limit counts everything the agent prepared or submitted today
  const handledToday = await prisma.openClawApplication.count({
    where: {
      userId,
      appliedAt: { gte: startOfToday() },
      OR: [{ status: 'ReadyToApply' }, { status: 'Applied', submittedVia: 'ats_api' }],
    },
  })
  // The student's own daily limit, capped by their plan (lib/billing/plans.ts)
  const { limits } = await getEntitlements(userId)
  const remaining = Math.max(0, Math.min(config.dailyLimit, limits.openclawPerDay) - handledToday)
  if (remaining === 0) return { ...result, status: 'limit_reached' }

  const filters = filtersFromConfig(config)
  const roles = filters.targetRoles.length ? filters.targetRoles : ['Software Engineer']
  const cities = filters.preferredCities.length ? filters.preferredCities : ['Remote']

  // Evaluate at most twice the remaining budget to bound AI cost per run
  const listings = await discoverJobs(roles, cities, Math.min(remaining * 2, 20))
  result.discovered = listings.length

  const skillNames = user.skills.map(s => s.skillName)
  const applicant: Applicant = {
    name: user.name,
    email: config.applicationEmail || user.email,
    phone: config.phone,
    linkedin: user.linkedin,
    github: user.github,
    college: user.college,
  }

  for (const listing of listings) {
    if (result.prepared + result.submitted >= remaining) break
    // Scoring + tailoring one job takes up to ~30 s
    if (opts.deadline && opts.deadline - Date.now() < 30_000) break

    // Filters first: they cost nothing and the student asked for exactly these jobs
    if (!checkFilters(listing, filters).ok) {
      result.skipped.filtered++
      continue
    }
    if (await alreadyInPipeline(userId, listing)) {
      result.skipped.duplicate++
      continue
    }

    try {
      result.evaluated++
      const match = await scoreJobMatch(userId, skillNames, `${listing.role} at ${listing.company}\n\n${listing.jdText}`)
      if (!match.applyRecommendation || match.matchScore < MIN_MATCH_SCORE || match.confidenceLevel === 'low') {
        result.skipped.lowMatch++
        continue
      }

      const resume = await createTailoredResume(userId, listing, match.matchScore)
      const submission = config.autoSubmit
        ? await submitThroughAts(listing.sourceUrl, applicant, { bytes: resume.pdf, fileName: resume.fileName })
        : { status: 'not_supported' as const }
      const submitted = submission.status === 'submitted'
      const notes = [match.tailoringNotes, submission.status === 'needs_review' ? `Not auto-submitted: ${submission.reason}` : null]
        .filter(Boolean).join('\n\n') || null

      await prisma.$transaction(async tx => {
        const saved = await tx.openClawListing.create({
          data: {
            platform: listing.platform,
            company: listing.company,
            role: listing.role,
            location: listing.location,
            ctcBand: listing.ctcBand,
            jdText: listing.jdText,
            sourceUrl: listing.sourceUrl,
          },
        })
        await tx.openClawApplication.create({
          data: {
            userId,
            listingId: saved.id,
            matchScore: match.matchScore,
            resumeVersionId: resume.resumeVersionId,
            status: submitted ? 'Applied' : 'ReadyToApply',
            submittedVia: submitted ? 'ats_api' : null,
            externalRef: submitted ? submission.externalRef : null,
            tailoringNotes: notes,
          },
        })
      })
      if (submitted) result.submitted++
      else result.prepared++
    } catch (err) {
      result.skipped.failed++
      console.error(`[OpenClaw] could not prepare ${listing.company} / ${listing.role}:`, (err as Error).message)
    }
  }

  if (result.prepared + result.submitted > 0) {
    const parts = [
      result.submitted ? `${result.submitted} submitted for you` : null,
      result.prepared ? `${result.prepared} ready for you to submit` : null,
    ].filter(Boolean)
    await prisma.notification.create({
      data: {
        userId,
        type: 'system',
        title: `Smart Apply: ${parts.join(', ')}`,
        body: 'Each one has a résumé tailored to the job. Review them in Smart Apply.',
        link: '/smart-apply',
      },
    }).catch(err => console.warn('[OpenClaw] notification failed:', err.message))
  }

  console.log(`[OpenClaw] user ${userId}:`, JSON.stringify(result))
  return result
}

async function alreadyInPipeline(userId: string, listing: JobListing) {
  const existing = await prisma.openClawApplication.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_STATUSES] },
      listing: {
        OR: [
          { sourceUrl: listing.sourceUrl },
          {
            company: { equals: listing.company, mode: 'insensitive' },
            role: { equals: listing.role, mode: 'insensitive' },
          },
        ],
      },
    },
    select: { id: true },
  })
  return Boolean(existing)
}
