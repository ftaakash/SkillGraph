export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { facultyContext, ensureWorkspaceCodes, rotateCode, collegeStudents } from '@/lib/tenant'

// GET /api/faculty/workspace — the faculty member's college workspace: codes, members, licence seats
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()

    const college = await ensureWorkspaceCodes(ctx.collegeId)
    if (!college) return unauthorized()

    const now = new Date()
    const [studentCount, faculty, licences] = await Promise.all([
      prisma.user.count({ where: collegeStudents(ctx.collegeId) }),
      prisma.user.findMany({
        where: { role: 'FACULTY', collegeId: ctx.collegeId },
        select: { id: true, name: true, email: true, isCollegeAdmin: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.subscription.findMany({
        where: { ownerType: 'college', ownerId: ctx.collegeId, plan: 'college_licence', status: 'active', periodEnd: { gt: now } },
        select: { seats: true, periodStart: true, periodEnd: true },
        orderBy: { periodStart: 'asc' },
      }),
    ])
    const effective = licences.filter(l => l.periodStart && l.periodStart <= now)
    const seats = effective.reduce((n, l) => n + (l.seats ?? 0), 0)

    return ok({
      college: { id: college.id, name: college.name, city: college.city, state: college.state, tier: college.tier },
      isAdmin: ctx.isCollegeAdmin,
      studentJoinCode: college.joinCode,
      // The faculty invite code grants access to student data — admins only
      facultyInviteCode: ctx.isCollegeAdmin ? college.facultyInviteCode : null,
      students: { joined: studentCount, licensedSeats: seats, covered: Math.min(studentCount, seats) },
      licences,
      faculty,
    })
  } catch (err) {
    console.error('[faculty/workspace GET]', err)
    return serverError()
  }
}

const actionSchema = z.object({ action: z.literal('rotate'), which: z.enum(['student', 'faculty']) })

// POST /api/faculty/workspace — admin actions (rotate a leaked code)
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()
    if (!ctx.isCollegeAdmin) return NextResponse.json({ error: 'Only workspace admins can do this' }, { status: 403 })

    const parsed = actionSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Invalid action')

    const college = await rotateCode(ctx.collegeId, parsed.data.which)
    return ok({ studentJoinCode: college.joinCode, facultyInviteCode: college.facultyInviteCode })
  } catch (err) {
    console.error('[faculty/workspace POST]', err)
    return serverError()
  }
}
