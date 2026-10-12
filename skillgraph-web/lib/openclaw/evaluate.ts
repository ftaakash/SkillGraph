import type { JobListing } from '@/lib/jobs'
import { prisma } from '@/lib/prisma'
import { scoreJobListing } from './scorer'
import { extractStories } from './storybank'
import { OPEN_STATUSES } from './status'

/**
 * Scores a listing for a student and records it in their pipeline as `Pending`
 * (human-in-the-loop: the student decides whether to apply).
 * Returns the existing evaluation if this posting is already in their pipeline.
 */
export async function evaluateListing(userId: string, job: JobListing) {
  if (job.sourceUrl) {
    const existing = await prisma.openClawApplication.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] }, listing: { sourceUrl: job.sourceUrl } },
      include: { listing: true },
      orderBy: { appliedAt: 'desc' },
    })
    if (existing) {
      const evaluation = await prisma.evaluationResult.findUnique({ where: { applicationId: existing.id } })
      const { listing, ...application } = existing
      return { listing, application, evaluation, existing: true as const }
    }
  }

  const student = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { select: { skillName: true, proficiency: true } },
      sprints: { select: { completionPercentage: true }, take: 5, orderBy: { generatedAt: 'desc' } },
      OpenClawConfig: { select: { preferredCities: true, minCtcLpa: true } },
    },
  })
  if (!student) throw new Error(`Student ${userId} not found`)

  const listing = await prisma.openClawListing.create({
    data: {
      platform: job.platform,
      company: job.company,
      role: job.role,
      location: job.location,
      ctcBand: job.ctcBand,
      jdText: job.jdText,
      sourceUrl: job.sourceUrl,
    },
  })

  const evaluation = await scoreJobListing(listing, student, {
    preferredCities: (student.OpenClawConfig?.preferredCities as string[] | undefined) ?? [],
    minCtcLpa: student.OpenClawConfig?.minCtcLpa ?? 5,
  })

  const application = await prisma.$transaction(async tx => {
    const app = await tx.openClawApplication.create({
      data: {
        userId,
        listingId: listing.id,
        matchScore: evaluation.totalScore,
        status: 'Pending',
        tailoringNotes: JSON.stringify(evaluation),
      },
    })
    await tx.evaluationResult.create({
      data: {
        applicationId: app.id,
        totalScore: evaluation.totalScore,
        grade: evaluation.grade,
        dimensions: evaluation.dimensions as object,
        recommendation: evaluation.recommendation,
        keyStrengths: evaluation.keyStrengths,
        keyWeaknesses: evaluation.keyWeaknesses,
        negotiationLeverage: evaluation.negotiationLeverage,
      },
    })
    return app
  })

  // Interview prep for strong matches — best effort, never blocks the response
  if (evaluation.grade === 'A' || evaluation.grade === 'B') {
    extractStories(userId, listing.role, listing.company, listing.jdText, student.skills.map(s => s.skillName))
      .catch(err => console.warn('[openclaw] story extraction failed:', (err as Error).message))
  }

  return { listing, application, evaluation, existing: false as const }
}
