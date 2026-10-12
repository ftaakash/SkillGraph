import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api'
import { cached, PUBLIC_CACHE } from '@/lib/cache'

// Public endpoint for the landing page impact dashboard
export async function GET(req: NextRequest) {
  try {
    // Cached per instance and at the CDN — landing-page traffic must not fan out to the database
    const stats = await cached('stats:landing', 5 * 60 * 1000, async () => {
      const [userCount, gapCount, completedSprints, optimizerCount] = await Promise.all([
        prisma.user.count(),
        prisma.skillGap.count(),
        prisma.sprint.count({ where: { status: 'completed' } }),
        prisma.optimizerSession.count(),
      ])
      return {
        studentsAnalyzed: userCount,
        skillGapsFound: gapCount,
        sprintsCompleted: completedSprints,
        linkedinOptimized: optimizerCount,
      }
    })
    return NextResponse.json(stats, { headers: { 'Cache-Control': PUBLIC_CACHE } })
  } catch (err) {
    console.error('[stats GET]', err)
    return serverError()
  }
}
