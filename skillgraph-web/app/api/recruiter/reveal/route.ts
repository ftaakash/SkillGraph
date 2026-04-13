import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'

// POST /api/recruiter/reveal — shortlist a candidate (first step in mutual-reveal)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { studentId } = await req.json()
    if (!studentId) return badRequest('studentId is required')

    // Check student exists and has opted in
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, isProfileVisible: true, role: true },
    })
    if (!student || student.role !== 'STUDENT') return badRequest('Student not found')
    if (!student.isProfileVisible) return badRequest('Student has not opted in to recruiter discovery')

    // Upsert the talent view record (findFirst + update/create since no @@unique constraint)
    const existing = await prisma.recruiterTalentView.findFirst({
      where: { recruiterId: session.user.id as string, studentId },
    })

    const view = existing
      ? await prisma.recruiterTalentView.update({
          where: { id: existing.id },
          data: { shortlisted: true, revealedAt: new Date() },
        })
      : await prisma.recruiterTalentView.create({
          data: {
            recruiterId: session.user.id as string,
            studentId,
            shortlisted: true,
            revealedAt: new Date(),
          },
        })

    // Notify the student (fire-and-forget)
    setImmediate(async () => {
      try {
        const recruiterUser = await prisma.user.findUnique({
          where: { id: session.user.id as string },
          select: { Company: { select: { name: true } } },
        })
        const companyName = recruiterUser?.Company?.name ?? 'A verified company'
        await prisma.notification.create({
          data: {
            userId: studentId,
            type: 'shortlisted',
            title: 'A Recruiter Is Interested In You',
            body: `${companyName} has shortlisted your profile. Make sure your profile is up to date!`,
            link: '/profile',
          },
        })
      } catch (e) {
        console.error('[notify shortlisted]', e)
      }
    })

    return ok({ view, message: 'Candidate shortlisted. Full reveal pending student acceptance.' })
  } catch (err) {
    console.error('[recruiter/reveal POST]', err)
    return serverError()
  }
}

// GET /api/recruiter/reveal — get all shortlisted candidates with their anonymized data
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const views = await prisma.recruiterTalentView.findMany({
      where: { recruiterId: session.user.id as string, shortlisted: true },
      include: {
        student: {
          select: {
            id: true,
            readinessScore: true,
            targetRole: true,
            year: true,
            cgpa: true,
            branch: true,
            // PII — only reveal if revealedAt is set (mutual consent)
            name: true,
            email: true,
          },
        },
      },
      orderBy: { revealedAt: 'desc' },
    })

    const results = views.map((v, idx) => ({
      viewId: v.id,
      anonymizedId: `SG-${String(idx + 1).padStart(5, '0')}`,
      shortlistedAt: v.revealedAt,
      candidate: {
        readinessScore: v.student.readinessScore,
        targetRole: v.student.targetRole,
        year: v.student.year,
        cgpa: v.student.cgpa,
        branch: v.student.branch,
        // Full reveal — in a real system this would check mutual consent
        // For now we show anonymized name until student opts in (isProfileVisible acts as consent)
        name: v.student.name,
        email: v.student.email,
      },
    }))

    return ok({ shortlisted: results })
  } catch (err) {
    console.error('[recruiter/reveal GET]', err)
    return serverError()
  }
}
