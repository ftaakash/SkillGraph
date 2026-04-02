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

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    console.error('Create faculty job posting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
