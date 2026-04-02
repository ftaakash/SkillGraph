import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'RECRUITER' || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const totalViewed = await prisma.recruiterTalentView.count({ where: { recruiterId: user.id } })
    const shortlisted = await prisma.recruiterTalentView.count({ where: { recruiterId: user.id, shortlisted: true } })
    const hired = 0 // TODO: track from PlacementRecord

    const topSkills = await prisma.skillProfile.groupBy({
      by: ['skillName'],
      _count: { skillName: true },
      orderBy: { _count: { skillName: 'desc' } },
      take: 8,
    })

    return NextResponse.json({
      totalViewed,
      shortlisted,
      hired,
      topSkills: topSkills.map(s => ({ skill: s.skillName, count: s._count.skillName })),
    })
  } catch (err) {
    console.error('[recruiter/analytics GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
