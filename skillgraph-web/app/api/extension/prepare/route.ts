export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, badRequest, serverError, aiFailure } from '@/lib/api'
import { extensionStudent, autofillProfile, EXTENSION_PLATFORMS } from '@/lib/extension'
import { checkFilters, filtersFromConfig } from '@/lib/openclaw/filters'
import { OPEN_STATUSES } from '@/lib/openclaw/status'
import { createTailoredResume, resumeFileName, NoResumeSource } from '@/lib/resume/tailor'
import { readPrivateFile } from '@/lib/storage'
import { tailoringLimitReached } from '@/lib/openclaw/limits'

const bodySchema = z.object({
  platform: z.enum(EXTENSION_PLATFORMS),
  url: z.string().trim().url().max(2000),
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
  ctcBand: z.string().trim().max(100).optional(),
  jdText: z.string().trim().min(50, 'Open the full job description first').max(20_000),
  // Prepare even though the job is outside the student's filters (they chose it on the page)
  force: z.boolean().optional(),
})

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

// POST /api/extension/prepare — check the job against the student's filters, then return a
// résumé tailored to it plus the values to fill the application form with. Nothing is submitted.
export async function POST(req: NextRequest) {
  try {
    const auth = await extensionStudent(req)
    if ('error' in auth) return auth.error
    const { userId } = auth
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid job details')
    const job = parsed.data

    const config = await prisma.openClawConfig.findUnique({ where: { userId } })
    const verdict = config
      ? checkFilters({ ...job, location: job.location ?? null, ctcBand: job.ctcBand ?? null }, filtersFromConfig(config))
      : { ok: true as const, reasons: ['No OpenClaw filters set yet'] }
    if (!verdict.ok && !job.force) return ok({ verdict, prepared: false })

    // Same posting already in the pipeline with a tailored résumé: reuse it (no new AI call)
    const existing = await prisma.openClawApplication.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] }, listing: { sourceUrl: job.url } },
      orderBy: { appliedAt: 'desc' },
      select: { id: true, status: true, resumeVersionId: true },
    })
    if (existing?.resumeVersionId) {
      const version = await prisma.resumeVersion.findFirst({ where: { id: existing.resumeVersionId, userId }, select: { cloudinaryUrl: true } })
      const bytes = version?.cloudinaryUrl ? await readPrivateFile(version.cloudinaryUrl) : null
      if (bytes) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
        return ok({
          verdict,
          prepared: true,
          reused: true,
          applicationId: existing.id,
          status: existing.status,
          resume: { fileName: resumeFileName(user?.name ?? null, job.company), base64: toBase64(bytes) },
          profile: await autofillProfile(userId),
        })
      }
    }

    const limited = await tailoringLimitReached(userId)
    if (limited) return limited
    const resume = await createTailoredResume(userId, { company: job.company, role: job.role, jdText: job.jdText, sourceUrl: job.url })

    const applicationId = existing
      ? (await prisma.openClawApplication.update({
          where: { id: existing.id },
          data: { resumeVersionId: resume.resumeVersionId, status: existing.status === 'Pending' ? 'ReadyToApply' : existing.status },
          select: { id: true },
        })).id
      : await prisma.$transaction(async tx => {
          const listing = await tx.openClawListing.create({
            data: {
              platform: job.platform,
              company: job.company,
              role: job.role,
              location: job.location ?? null,
              ctcBand: job.ctcBand ?? null,
              jdText: job.jdText,
              sourceUrl: job.url,
            },
          })
          const app = await tx.openClawApplication.create({
            data: { userId, listingId: listing.id, resumeVersionId: resume.resumeVersionId, status: 'ReadyToApply' },
            select: { id: true },
          })
          return app.id
        })

    return ok({
      verdict,
      prepared: true,
      reused: false,
      applicationId,
      status: 'ReadyToApply',
      resume: { fileName: resume.fileName, base64: toBase64(resume.pdf) },
      profile: await autofillProfile(userId),
    })
  } catch (err) {
    if (err instanceof NoResumeSource) return badRequest('Upload your résumé on SkillGraph first, so the tailored version uses your real experience.')
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[extension/prepare]', err)
    return serverError()
  }
}
