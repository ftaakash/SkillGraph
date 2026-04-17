import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'
import { scoreJobListing } from '@/lib/openclaw/scorer'
import { extractStories } from '@/lib/openclaw/storybank'
import { scrapeJobUrl } from '@/lib/openclaw/scraper'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const { jobUrl } = await req.json()
    if (!jobUrl) return badRequest('jobUrl is required')

    // 1. Scrape
    const scrapedData = await scrapeJobUrl(jobUrl)
    if (!scrapedData) return badRequest('Failed to scrape job URL')

    // 2. Upsert listing
    const listing = await prisma.openClawListing.upsert({
      where: { id: scrapedData.id ?? 'new' },
      update: {},
      create: {
        platform: scrapedData.platform,
        company: scrapedData.company,
        role: scrapedData.role,
        location: scrapedData.location ?? null,
        ctcBand: scrapedData.ctcBand ?? null,
        jdText: scrapedData.jdText,
        sourceUrl: jobUrl,
      },
    })

    // 3. Fetch student context
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { select: { skillName: true, proficiency: true } },
        sprints: { select: { completionPercentage: true }, take: 5, orderBy: { generatedAt: 'desc' } },
        OpenClawConfig: { select: { preferredCities: true, minCtcLpa: true } },
      },
    })
    if (!student) return badRequest('Student not found')

    const config = {
      preferredCities: (student.OpenClawConfig?.preferredCities as string[]) ?? [],
      minCtcLpa: student.OpenClawConfig?.minCtcLpa ?? 5,
    }

    // 4. Score
    const evaluation = await scoreJobListing(listing, student, config)

    // 5. Create application record (HUMAN-IN-LOOP: status = Pending, not Applied)
    const application = await prisma.openClawApplication.create({
      data: {
        userId,
        listingId: listing.id,
        matchScore: evaluation.totalScore,
        status: 'Pending',
        tailoringNotes: JSON.stringify(evaluation),
      },
    })

    // 6. Persist EvaluationResult (cast as any until Prisma client regenerates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).evaluationResult.create({
      data: {
        applicationId: application.id,
        totalScore: evaluation.totalScore,
        grade: evaluation.grade,
        dimensions: evaluation.dimensions as object,
        recommendation: evaluation.recommendation,
        keyStrengths: evaluation.keyStrengths,
        keyWeaknesses: evaluation.keyWeaknesses,
        negotiationLeverage: evaluation.negotiationLeverage,
      },
    })

    // 7. Fire-and-forget: extract stories for A/B grades
    if (evaluation.grade === 'A' || evaluation.grade === 'B') {
      setImmediate(() => {
        extractStories(
          userId,
          listing.role,
          listing.company,
          listing.jdText,
          student.skills.map(s => s.skillName)
        ).catch(console.error)
      })
    }

    return ok({
      listing,
      application,
      evaluation,
    })
  } catch (err) {
    console.error('[openclaw/pipeline]', err)
    return serverError()
  }
}
