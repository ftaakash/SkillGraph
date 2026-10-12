import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { listShortlist } from '@/lib/talent'

const PIPELINE_STAGES = ['Shortlisted', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

async function recruiterId() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.role === 'RECRUITER' && user.id ? user.id : null
}

export async function GET() {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const views = await listShortlist(id)

    // Group by pipeline stage (stored in the notes field by convention)
    const pipeline: Record<string, typeof views> = {}
    for (const stage of PIPELINE_STAGES) pipeline[stage] = []
    for (const v of views) {
      const stage = v.notes || 'Shortlisted'
      ;(pipeline[stage] ?? pipeline['Shortlisted']).push(v)
    }

    return NextResponse.json({ pipeline, stages: PIPELINE_STAGES })
  } catch (err) {
    console.error('[recruiter/pipeline GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({ viewId: z.string().min(1).max(64), stage: z.enum(PIPELINE_STAGES as [string, ...string[]]) })

export async function PATCH(req: NextRequest) {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'viewId and a valid stage are required' }, { status: 400 })

    // Scoped to the recruiter's own views
    const result = await prisma.recruiterTalentView.updateMany({
      where: { id: parsed.data.viewId, recruiterId: id },
      data: { notes: parsed.data.stage },
    })
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ view: { id: parsed.data.viewId, notes: parsed.data.stage } })
  } catch (err) {
    console.error('[recruiter/pipeline PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
