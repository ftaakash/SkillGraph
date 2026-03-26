import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverError, ok } from '@/lib/api'
import { getUserId, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const year = searchParams.get('year')

    const where: { role?: string; year?: string } = {}
    if (role) where.role = role
    if (year) where.year = year

    const data = await prisma.benchmark.findMany({
      where,
      select: { readinessScore: true, role: true, year: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    // Build histogram buckets (0–9, 10–19, ..., 90–100)
    const buckets: Record<string, number> = {}
    for (let i = 0; i <= 90; i += 10) {
      buckets[`${i}`] = 0
    }
    for (const row of data) {
      const bucket = Math.min(Math.floor(row.readinessScore / 10) * 10, 90)
      buckets[`${bucket}`]++
    }

    const scores = data.map(d => d.readinessScore).sort((a, b) => a - b)
    const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0
    const p90 = scores.length > 0 ? scores[Math.floor(scores.length * 0.9)] : 0

    return ok({
      buckets: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      median: Math.round(median),
      top10Threshold: Math.round(p90),
      totalStudents: data.length,
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
