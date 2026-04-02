import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const PIPELINE_STAGES = ['Shortlisted', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

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

    // Group by pipeline stage (stored in notes field as convention)
    const pipeline: Record<string, typeof views> = {}
    for (const stage of PIPELINE_STAGES) pipeline[stage] = []
    for (const v of views) {
      const stage = v.notes || 'Shortlisted'
      if (pipeline[stage]) pipeline[stage].push(v)
      else pipeline['Shortlisted'].push(v)
    }

    return NextResponse.json({ pipeline, stages: PIPELINE_STAGES })
  } catch (err) {
    console.error('[recruiter/pipeline GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'RECRUITER' || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { viewId, stage } = await req.json()
    if (!viewId || !stage) return NextResponse.json({ error: 'viewId and stage required' }, { status: 400 })
    if (!PIPELINE_STAGES.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const updated = await prisma.recruiterTalentView.update({
      where: { id: viewId },
      data: { notes: stage },
    })

    return NextResponse.json({ view: updated })
  } catch (err) {
    console.error('[recruiter/pipeline PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
