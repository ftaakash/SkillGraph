import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError } from '@/lib/api'

// POST /api/openclaw/integrity — daily dedup cron
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-cron-secret')
    if (authHeader !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return ok({ message: 'Unauthorized cron call' })
    }

    // Fetch all active apps with their listing data
    const apps = await prisma.openClawApplication.findMany({
      where: { status: { in: ['Pending', 'Applied'] } },
    })

    // For each app, look up the listing by listingId to get company+role
    const seen = new Map<string, string>()
    const toMarkDup: string[] = []

    for (const app of apps) {
      const listing = await prisma.openClawListing.findUnique({
        where: { id: app.listingId },
        select: { company: true, role: true },
      })
      if (!listing) continue

      const key = `${app.userId}::${listing.company.toLowerCase()}::${listing.role.toLowerCase()}`
      if (seen.has(key)) {
        toMarkDup.push(app.id)
      } else {
        seen.set(key, app.id)
      }
    }

    if (toMarkDup.length > 0) {
      await prisma.openClawApplication.updateMany({
        where: { id: { in: toMarkDup } },
        data: { status: 'Duplicate' },
      })
    }

    return ok({ deduped: toMarkDup.length, total: apps.length })
  } catch (err) {
    console.error('[openclaw/integrity]', err)
    return serverError()
  }
}
