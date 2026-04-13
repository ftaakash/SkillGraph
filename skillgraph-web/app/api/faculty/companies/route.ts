import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string; collegeId?: string }
    if (user.role !== 'FACULTY') return unauthorized()

    const collegeId = user.collegeId || ''

    // Get all company IDs from job postings for this college
    const postings = await prisma.facultyJobPosting.findMany({
      where: { collegeId },
      select: { companyId: true, company: true, id: true },
    })

    // Get unique company names from postings (some are faculty-posted without a Company entity)
    const companyIdSet = new Set(postings.map(p => p.companyId).filter(Boolean) as string[])

    // Fetch full Company entities where linked
    const companies = companyIdSet.size > 0
      ? await prisma.company.findMany({
          where: { id: { in: Array.from(companyIdSet) } },
          select: {
            id: true,
            name: true,
            website: true,
            tier: true,
            verificationStatus: true,
            hrEmail: true,
            logoUrl: true,
          },
        })
      : []

    // Count jobs per company
    const jobCountByCompanyId = postings.reduce<Record<string, number>>((acc, p) => {
      if (p.companyId) {
        acc[p.companyId] = (acc[p.companyId] || 0) + 1
      }
      return acc
    }, {})

    const enriched = companies.map(c => ({
      ...c,
      jobCount: jobCountByCompanyId[c.id] || 0,
    }))

    // Also include faculty-posted jobs without a linked company entity
    const unlinkedNames = [...new Set(
      postings.filter(p => !p.companyId).map(p => p.company)
    )].map(name => ({
      id: null,
      name,
      website: null,
      tier: 'Unknown',
      verificationStatus: 'UNVERIFIED',
      hrEmail: null,
      logoUrl: null,
      jobCount: postings.filter(p => p.company === name).length,
    }))

    return ok({ companies: [...enriched, ...unlinkedNames] })
  } catch (err) {
    console.error('[faculty/companies GET]', err)
    return serverError()
  }
}
