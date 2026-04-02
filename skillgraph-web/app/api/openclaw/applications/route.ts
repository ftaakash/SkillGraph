import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — list user's OpenClaw auto-applications with listing details
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const applications = await prisma.openClawApplication.findMany({
    where: { userId: session.user.id },
    orderBy: { appliedAt: 'desc' },
    take: 50,
  })

  // Fetch listing details for each application
  const listingIds = applications.map(a => a.listingId)
  const listings = await prisma.openClawListing.findMany({
    where: { id: { in: listingIds } },
  })
  const listingMap = new Map(listings.map(l => [l.id, l]))

  const enriched = applications.map(app => ({
    ...app,
    listing: listingMap.get(app.listingId) ?? null,
  }))

  // Summary stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const appliedToday = applications.filter(a => new Date(a.appliedAt) >= todayStart).length

  return NextResponse.json({
    applications: enriched,
    stats: {
      total: applications.length,
      appliedToday,
      avgMatchScore: applications.length > 0
        ? Math.round(applications.reduce((s, a) => s + (a.matchScore ?? 0), 0) / applications.length)
        : 0,
    },
  })
}
