import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverError, ok } from '@/lib/api'
import { getUserId, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const year = searchParams.get('year')

    const userId = await getUserId()
    let userCollegeId: string | null = null
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { collegeId: true } })
      userCollegeId = u?.collegeId || null
    }

    const where: { role?: string; year?: string } = {}
    if (role) where.role = role
    if (year) where.year = year

    const data = await prisma.benchmark.findMany({
      where,
      select: { readinessScore: true, role: true, year: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const cohortWhere: any = { role: 'STUDENT', readinessScore: { not: null } }
    if (userCollegeId) cohortWhere.collegeId = userCollegeId
    if (role) cohortWhere.targetRole = role
    if (year) cohortWhere.year = year
    const cohortUsers = await prisma.user.findMany({ where: cohortWhere, select: { readinessScore: true } })

    const buckets: Record<string, number> = {}
    const cohortBuckets: Record<string, number> = {}
    for (let i = 0; i <= 90; i += 10) { buckets[`${i}`] = 0; cohortBuckets[`${i}`] = 0 }

    for (const row of data) {
      const bucket = Math.min(Math.floor(row.readinessScore / 10) * 10, 90)
      buckets[`${bucket}`]++
    }
    for (const u of cohortUsers) {
      const bucket = Math.min(Math.floor((u.readinessScore || 0) / 10) * 10, 90)
      cohortBuckets[`${bucket}`]++
    }

    const scores = data.map(d => d.readinessScore).sort((a, b) => a - b)
    const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0
    const p90 = scores.length > 0 ? scores[Math.floor(scores.length * 0.9)] : 0

    const cohortScores = cohortUsers.map(d => d.readinessScore || 0).sort((a, b) => a - b)
    const cohortMedian = cohortScores.length > 0 ? cohortScores[Math.floor(cohortScores.length / 2)] : 0
    const cohortP90 = cohortScores.length > 0 ? cohortScores[Math.floor(cohortScores.length * 0.9)] : 0

    return ok({
      buckets: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      cohortBuckets: Object.entries(cohortBuckets).map(([range, count]) => ({ range, count })),
      median: Math.round(median),
      top10Threshold: Math.round(p90),
      totalStudents: data.length,
      cohortMedian: Math.round(cohortMedian),
      cohortTop10Threshold: Math.round(cohortP90),
      cohortTotalStudents: cohortUsers.length,
      hasCohortDetails: !!userCollegeId
    })
  } catch (err) {
    console.error('[benchmarks GET]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true, year: true, readinessScore: true },
    })
    if (!user?.readinessScore || !user.targetRole) return ok({ skipped: true })

    await prisma.benchmark.create({
      data: {
        role: user.targetRole,
        year: user.year ?? 'Unknown',
        readinessScore: user.readinessScore,
        collegeTier: 'Tier-2',
      },
    })

    return ok({ success: true })
  } catch (err) {
    console.error('[benchmarks POST]', err)
    return serverError()
  }
}
