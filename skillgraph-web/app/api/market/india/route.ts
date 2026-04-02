import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch all records, assuming the seeder populates fresh data per week
    const marketData = await prisma.indiaMarketData.findMany({
      orderBy: { weekOf: 'desc' },
      take: 200,
    })

    // Prepare aggregated structure
    const topSkills = new Map<string, number>()
    const ctcBands = new Map<string, number[]>()
    const cityDemand = new Map<string, number>()
    let totalDemand = 0

    marketData.forEach(item => {
      // Aggregate skills
      if (item.skill) {
        topSkills.set(item.skill, (topSkills.get(item.skill) || 0) + (item.demandCount || 0))
      }

      // Aggregate CTC by tier
      if (item.companyTier && item.avgCtcLpa) {
        if (!ctcBands.has(item.companyTier)) ctcBands.set(item.companyTier, [])
        ctcBands.get(item.companyTier)!.push(item.avgCtcLpa)
      }

      // Aggregate city demand
      if (item.city) {
        const count = item.demandCount || 100
        cityDemand.set(item.city, (cityDemand.get(item.city) || 0) + count)
        totalDemand += count
      }
    })

    // Process CTC averages
    const avgCtcByTier = Array.from(ctcBands.entries()).map(([tier, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      return { tier, avgCtc: Math.round(avg * 10) / 10 }
    })

    // Process top skills sorted
    const topSkillsSorted = Array.from(topSkills.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // Process city percentages
    const cityDemandStats = Array.from(cityDemand.entries())
      .map(([city, count]) => ({ city, percentage: Math.round((count / Math.max(totalDemand, 1)) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)

    return NextResponse.json({
      topSkills: topSkillsSorted,
      avgCtcByTier,
      cityDemand: cityDemandStats,
    })
  } catch (error) {
    console.error('Error fetching market data:', error)
    return NextResponse.json({ error: 'Failed to retrieve market intelligence' }, { status: 500 })
  }
}
