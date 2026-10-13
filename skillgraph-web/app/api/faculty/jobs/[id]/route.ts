export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { facultyJob, driveOverview } from '@/lib/placement/faculty'

const notFound = () => NextResponse.json({ error: 'Job not found' }, { status: 404 })

// GET /api/faculty/jobs/:id — the drive, its rounds (with check-in codes) and every applicant's progress
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyJob(userId, id)
    if (!found) return notFound()
    const overview = await driveOverview(found.job.id)
    return ok({ job: found.job, ...overview })
  } catch (err) {
    console.error('[faculty/jobs/:id GET]', err)
    return serverError()
  }
}

const patchSchema = z.object({
  category: z.string().trim().max(40).nullable().optional(),
  batchYear: z.number().int().min(2000).max(2100).nullable().optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  driveDate: z.string().datetime({ offset: true }).nullable().optional(),
})

// PATCH /api/faculty/jobs/:id — drive details shown to students (tier, batch, dates)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const found = await facultyJob(userId, id)
    if (!found) return notFound()
    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')
    const { category, batchYear, deadline, driveDate } = parsed.data
    const job = await prisma.facultyJobPosting.update({
      where: { id: found.job.id },
      data: {
        ...(category !== undefined ? { category: category || null } : {}),
        ...(batchYear !== undefined ? { batchYear } : {}),
        ...(deadline ? { deadline: new Date(deadline) } : {}),
        ...(driveDate !== undefined ? { driveDate: driveDate ? new Date(driveDate) : null } : {}),
      },
    })
    return ok({ job })
  } catch (err) {
    console.error('[faculty/jobs/:id PATCH]', err)
    return serverError()
  }
}
