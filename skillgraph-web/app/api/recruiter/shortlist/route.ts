import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { listShortlist, findDiscoverableStudent } from '@/lib/talent'

async function recruiterId() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.role === 'RECRUITER' && user.id ? user.id : null
}

// GET /api/recruiter/shortlist — identity is masked until the student accepts a reveal request
export async function GET() {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ shortlist: await listShortlist(id) })
  } catch (err) {
    console.error('[recruiter/shortlist GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const bodySchema = z.object({ studentId: z.string().min(1).max(64) })

// POST /api/recruiter/shortlist — toggle a discoverable student on the recruiter's shortlist
export async function POST(req: NextRequest) {
  try {
    const id = await recruiterId()
    if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    const { studentId } = parsed.data

    const existing = await prisma.recruiterTalentView.findUnique({
      where: { recruiterId_studentId: { recruiterId: id, studentId } },
    })
    if (existing) {
      const view = await prisma.recruiterTalentView.update({
        where: { id: existing.id },
        data: { shortlisted: !existing.shortlisted },
      })
      return NextResponse.json({ view: { id: view.id, shortlisted: view.shortlisted, revealStatus: view.revealStatus } })
    }

    if (!(await findDiscoverableStudent(studentId))) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    const view = await prisma.recruiterTalentView.create({ data: { recruiterId: id, studentId, shortlisted: true } })
    return NextResponse.json({ view: { id: view.id, shortlisted: view.shortlisted, revealStatus: view.revealStatus } }, { status: 201 })
  } catch (err) {
    console.error('[recruiter/shortlist POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
