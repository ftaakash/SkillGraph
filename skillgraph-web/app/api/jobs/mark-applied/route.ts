import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { studentCollegeId } from '@/lib/tenant'

const bodySchema = z.object({ jobPostingId: z.string().min(1).max(40) })

async function context(req: NextRequest, body: unknown) {
  const user = (await auth())?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'STUDENT') return { error: unauthorized() }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return { error: badRequest('jobPostingId is required') }
  const [collegeId, job] = await Promise.all([
    studentCollegeId(user.id),
    prisma.facultyJobPosting.findUnique({ where: { id: parsed.data.jobPostingId }, select: { id: true, collegeId: true } }),
  ])
  // Only drives at the student's own college; 404 rather than revealing other colleges' ids
  if (!job || !collegeId || job.collegeId !== collegeId) return { error: NextResponse.json({ error: 'Job not found' }, { status: 404 }) }
  return { userId: user.id, jobId: job.id }
}

// POST /api/jobs/mark-applied — the student applied on another portal (e.g. Haveloc) and tracks it here
export async function POST(req: NextRequest) {
  try {
    const ctx = await context(req, await req.json().catch(() => null))
    if ('error' in ctx) return ctx.error
    const existing = await prisma.jobApplication.findFirst({ where: { userId: ctx.userId, jobPostingId: ctx.jobId } })
    if (existing) return ok({ application: existing })
    const application = await prisma.jobApplication.create({
      data: { userId: ctx.userId, jobPostingId: ctx.jobId, channel: 'external' },
    })
    await prisma.facultyJobPosting.update({ where: { id: ctx.jobId }, data: { applicationCount: { increment: 1 } } })
    return ok({ application })
  } catch (err) {
    console.error('[jobs/mark-applied POST]', err)
    return serverError()
  }
}

// DELETE /api/jobs/mark-applied — undo a mark made by mistake (only self-marked, untouched ones)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await context(req, { jobPostingId: req.nextUrl.searchParams.get('jobPostingId') })
    if ('error' in ctx) return ctx.error
    const { count } = await prisma.jobApplication.deleteMany({
      where: { userId: ctx.userId, jobPostingId: ctx.jobId, channel: 'external', status: 'Applied' },
    })
    if (count) await prisma.facultyJobPosting.update({ where: { id: ctx.jobId }, data: { applicationCount: { decrement: count } } })
    return ok({ removed: count > 0 })
  } catch (err) {
    console.error('[jobs/mark-applied DELETE]', err)
    return serverError()
  }
}
