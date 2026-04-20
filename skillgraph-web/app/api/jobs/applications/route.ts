import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

// GET /api/jobs/applications — student's own job applications with job details
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()

    const [apps, ocApps] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { userId: user.id },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.openClawApplication.findMany({
        where: { userId: user.id },
        include: { user: false }, // Use listingId manually to avoid complex join
        orderBy: { appliedAt: 'desc' },
      })
    ])

    // Fetch details for manual applications
    const jobIds = [...new Set(apps.map(a => a.jobPostingId))]
    const jobPostings = jobIds.length > 0
      ? await prisma.facultyJobPosting.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true, company: true, ctcMin: true, ctcMax: true, deadline: true },
        })
      : []
    const jobMap = Object.fromEntries(jobPostings.map(j => [j.id, j]))

    // Fetch details for OpenClaw applications
    const listingIds = [...new Set(ocApps.map(a => a.listingId))]
    const listings = listingIds.length > 0
      ? await prisma.openClawListing.findMany({
          where: { id: { in: listingIds } },
        })
      : []
    const listingMap = new Map(listings.map(l => [l.id, l]))

    const enrichedManual = apps.map(a => ({
      id: a.id,
      status: a.status,
      appliedAt: a.appliedAt,
      jobPosting: jobMap[a.jobPostingId] ? {
        id: jobMap[a.jobPostingId].id,
        title: jobMap[a.jobPostingId].title,
        company: jobMap[a.jobPostingId].company,
        ctcMin: jobMap[a.jobPostingId].ctcMin,
        ctcMax: jobMap[a.jobPostingId].ctcMax,
        deadline: jobMap[a.jobPostingId].deadline
      } : null,
      source: 'Internal'
    }))

    const enrichedOC = ocApps.map(a => {
      const l = listingMap.get(a.listingId)
      return {
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        jobPosting: l ? {
          id: l.id,
          title: l.role,
          company: l.company,
          ctcMin: null,
          ctcMax: null,
          deadline: null
        } : null,
        source: 'OpenClaw'
      }
    })

    const allApps = [...enrichedManual, ...enrichedOC].sort((a, b) => 
      new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    )

    return ok({ applications: allApps })
  } catch (err) {
    console.error('[jobs/applications GET]', err)
    return serverError()
  }
}
