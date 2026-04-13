import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — list job postings for the faculty's college
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'FACULTY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collegeId = session.user.collegeId
  if (!collegeId) {
    return NextResponse.json({ error: 'No college linked to account' }, { status: 400 })
  }

  const jobs = await prisma.facultyJobPosting.findMany({
    where: { collegeId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ jobs })
}

// POST — create a new faculty job posting
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'FACULTY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collegeId = session.user.collegeId
  if (!collegeId) {
    return NextResponse.json({ error: 'No college linked to account' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { title, company, description, ctcMin, ctcMax, minCgpa, eligibleBranches, deadline, driveDate } = body

    if (!title || !company || !description || !deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const job = await prisma.facultyJobPosting.create({
      data: {
        collegeId,
        title,
        company,
        description,
        ctcMin: ctcMin ? parseFloat(ctcMin) : null,
        ctcMax: ctcMax ? parseFloat(ctcMax) : null,
        minCgpa: minCgpa ? parseFloat(minCgpa) : null,
        eligibleBranches: eligibleBranches || [],
        deadline: new Date(deadline),
        driveDate: driveDate ? new Date(driveDate) : null,
      },
    })

    // Fire-and-forget: notify eligible students at this college
    setImmediate(async () => {
      try {
        const students = await prisma.user.findMany({
          where: { collegeId, role: 'STUDENT' },
          select: { id: true },
        })
        if (students.length > 0) {
          await prisma.notification.createMany({
            data: students.map(s => ({
              userId: s.id,
              type: 'job_posted',
              title: `New Job: ${title} at ${company}`,
              body: `Your placement cell posted a new opportunity. Deadline: ${new Date(deadline).toLocaleDateString('en-IN')}.`,
              link: `/jobs/${job.id}`,
            })),
            skipDuplicates: true,
          })
        }
      } catch (e) {
        console.error('[notify job_posted]', e)
      }
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    console.error('Create faculty job posting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
