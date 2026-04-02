import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'RECRUITER' || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const views = await prisma.recruiterTalentView.findMany({
      where: { recruiterId: user.id, shortlisted: true },
      include: {
        student: {
          select: { id: true, name: true, email: true, college: true, branch: true, readinessScore: true, targetRole: true },
        },
      },
      orderBy: { viewedAt: 'desc' },
    })

    return NextResponse.json({ shortlist: views })
  } catch (err) {
    console.error('[recruiter/shortlist GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'RECRUITER' || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { studentId } = await req.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const existing = await prisma.recruiterTalentView.findFirst({
      where: { recruiterId: user.id, studentId },
    })

    if (existing) {
      const updated = await prisma.recruiterTalentView.update({
        where: { id: existing.id },
        data: { shortlisted: !existing.shortlisted },
      })
      return NextResponse.json({ view: updated })
    }

    const view = await prisma.recruiterTalentView.create({
      data: { recruiterId: user.id, studentId, shortlisted: true },
    })
    return NextResponse.json({ view }, { status: 201 })
  } catch (err) {
    console.error('[recruiter/shortlist POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
