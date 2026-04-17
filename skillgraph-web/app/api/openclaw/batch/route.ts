import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'
import { scrapeJobUrl } from '@/lib/openclaw/scraper'
import { scoreJobListing } from '@/lib/openclaw/scorer'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const { jobUrls } = await req.json() as { jobUrls: string[] }
    if (!Array.isArray(jobUrls) || jobUrls.length === 0) return badRequest('jobUrls[] required')
    if (jobUrls.length > 10) return badRequest('Max 10 URLs per batch')

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

    // Evaluate all URLs concurrently (concurrency=5 as per spec)
    const CONCURRENCY = 5
    const results: Array<{ url: string; grade?: string; score?: number; error?: string }> = []

    for (let i = 0; i < jobUrls.length; i += CONCURRENCY) {
      const chunk = jobUrls.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(
        chunk.map(async (url) => {
          const scraped = await scrapeJobUrl(url)
          if (!scraped) return { url, error: 'Scrape failed' }

          const listing = await prisma.openClawListing.create({
            data: {
              platform: scraped.platform,
              company: scraped.company,
              role: scraped.role,
              location: scraped.location ?? null,
              ctcBand: scraped.ctcBand ?? null,
              jdText: scraped.jdText,
              sourceUrl: url,
            },
          })

          const evaluation = await scoreJobListing(listing, student, config)

          const application = await prisma.openClawApplication.create({
            data: { userId, listingId: listing.id, matchScore: evaluation.totalScore, status: 'Pending', tailoringNotes: JSON.stringify(evaluation) },
          })
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

          return { url, grade: evaluation.grade, score: evaluation.totalScore }
        })
      )

      for (const s of settled) {
        if (s.status === 'fulfilled') results.push(s.value as typeof results[0])
        else results.push({ url: 'unknown', error: String(s.reason) })
      }
    }

    return ok({ results })
  } catch (err) {
    console.error('[openclaw/batch]', err)
    return serverError()
  }
}
