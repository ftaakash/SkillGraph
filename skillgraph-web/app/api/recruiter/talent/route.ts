import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — anonymized talent search
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'RECRUITER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse filters from query params
  const searchParams = req.nextUrl.searchParams
  const countOnly = searchParams.get('count') === 'true'
  const roleFilter = searchParams.get('role') || undefined
  const minScore = parseFloat(searchParams.get('minScore') || '0')
  const yearFilter = searchParams.get('year') || undefined
  const skillsParam = searchParams.get('skills')
  const skills = skillsParam ? skillsParam.split(',') : undefined

  const where: Record<string, unknown> = {
    role: 'STUDENT',
    isProfileVisible: true,
  }

  if (roleFilter) {
    where.targetRole = { contains: roleFilter, mode: 'insensitive' }
  }
  if (minScore > 0) {
    where.readinessScore = { gte: minScore }
  }
  if (yearFilter) {
    where.year = yearFilter
  }
  if (skills && skills.length > 0) {
    where.skills = { some: { skillName: { in: skills } } }
  }

  if (countOnly) {
    const talentPoolSize = await prisma.user.count({ where: where as any })
    const shortlistedCount = await prisma.recruiterTalentView.count({
      where: { recruiterId: session.user.id, shortlisted: true },
    })

    return NextResponse.json({
      stats: {
        talentPoolSize,
        shortlistedCount,
        activeJobs: 0,
        pipelineCount: 0,
      }
    })
  }

  const candidates = await prisma.user.findMany({
    where: where as any,
    select: {
      id: true,
      readinessScore: true,
      targetRole: true,
      year: true,
      cgpa: true,
      // NEVER return PII
      name: false,
      email: false,
      college: false,
      skills: {
        select: { skillName: true, proficiency: true },
        take: 6,
      },
    },
    take: 50,
    orderBy: { readinessScore: 'desc' },
  })

  // Anonymize and format for frontend
  const anonymized = candidates.map((c) => ({
    id: c.id,
    name: `Candidate SG-${c.id.substring(0, 6).toUpperCase()}`,
    email: 'Hidden for privacy',
    college: null,
    branch: null,
    readinessScore: c.readinessScore,
    targetRole: c.targetRole,
    year: c.year,
    cgpa: c.cgpa,
    skills: c.skills,
  }))

  return NextResponse.json({ candidates: anonymized })
}
