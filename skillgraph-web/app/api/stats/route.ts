import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverError, ok } from '@/lib/api'

// Public endpoint for the landing page impact dashboard
export async function GET(req: NextRequest) {
  try {
    const [userCount, gapCount, completedSprints, optimizerCount] = await Promise.all([
      prisma.user.count(),
      prisma.skillGap.count(),
      prisma.sprint.count({ where: { status: 'completed' } }),
      prisma.optimizerSession.count(),
    ])

    return ok({
      studentsAnalyzed: userCount,
      skillGapsFound: gapCount,
      sprintsCompleted: completedSprints,
      linkedinOptimized: optimizerCount,
    })
  } catch (err) {
    console.error('[stats GET]', err)
    return serverError()
  }
}
