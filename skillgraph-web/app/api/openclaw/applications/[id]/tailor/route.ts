export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, badRequest, serverError, aiFailure } from '@/lib/api'
import { createTailoredResume, NoResumeSource } from '@/lib/resume/tailor'

// POST /api/openclaw/applications/:id/tailor — build a résumé tailored to this job (for jobs the
// student evaluated themselves; the agent and the extension tailor automatically)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const { id } = await params
    const app = await prisma.openClawApplication.findFirst({
      where: { id, userId: session.user.id },
      include: { listing: true },
    })
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const { listing } = app
    const resume = await createTailoredResume(
      session.user.id,
      { company: listing.company, role: listing.role, jdText: listing.jdText, sourceUrl: listing.sourceUrl },
      app.matchScore ?? undefined,
    )
    const updated = await prisma.openClawApplication.update({
      where: { id },
      data: { resumeVersionId: resume.resumeVersionId, ...(app.status === 'Pending' ? { status: 'ReadyToApply' } : {}) },
      select: { id: true, status: true, resumeVersionId: true },
    })
    return ok({ application: updated })
  } catch (err) {
    if (err instanceof NoResumeSource) return badRequest('Upload your résumé first, so the tailored version uses your real experience.')
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[openclaw/applications/:id/tailor]', err)
    return serverError()
  }
}
