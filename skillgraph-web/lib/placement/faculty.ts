/**
 * Faculty-side placement workflow helpers (ADR-003 Phase 6). Every lookup is scoped to the
 * faculty member's own college; anything else resolves to null and callers answer 404.
 */
import { prisma } from '@/lib/prisma'
import { facultyContext, generateCode } from '@/lib/tenant'
import { applicationProgress } from './rounds'

export async function facultyJob(userId: string, jobId: string) {
  const ctx = await facultyContext(userId)
  if (!ctx) return null
  const job = await prisma.facultyJobPosting.findFirst({ where: { id: jobId, collegeId: ctx.collegeId } })
  return job ? { ctx, job } : null
}

export async function facultyRound(userId: string, roundId: string) {
  const ctx = await facultyContext(userId)
  if (!ctx) return null
  const round = await prisma.driveRound.findFirst({ where: { id: roundId, jobPosting: { collegeId: ctx.collegeId } } })
  return round ? { ctx, round } : null
}

export const newAttendanceCode = () => generateCode(6)

/** A drive with its rounds and every applicant's progress, for the placement cell. */
export async function driveOverview(jobId: string) {
  const [rounds, applications] = await Promise.all([
    prisma.driveRound.findMany({ where: { jobPostingId: jobId }, orderBy: { position: 'asc' } }),
    prisma.jobApplication.findMany({
      where: { jobPostingId: jobId },
      include: {
        roundResults: true,
        user: { select: { id: true, name: true, email: true, branch: true, cgpa: true, AcademicProfile: { select: { regNo: true } } } },
      },
      orderBy: { appliedAt: 'asc' },
    }),
  ])
  const applicants = applications.map(app => {
    const progress = applicationProgress(rounds, app.roundResults, app.status)
    return {
      applicationId: app.id,
      status: app.status,
      channel: app.channel,
      appliedAt: app.appliedAt,
      student: {
        id: app.user.id, name: app.user.name, email: app.user.email, branch: app.user.branch, cgpa: app.user.cgpa,
        regNo: app.user.AcademicProfile?.regNo ?? null,
      },
      eliminated: progress.eliminated,
      currentRoundId: progress.currentRoundId,
      results: Object.fromEntries(
        progress.steps.map(s => [s.round.id, {
          state: s.state,
          confirmation: s.result?.confirmation ?? 'pending',
          attended: Boolean(s.result?.attendedAt),
        }]),
      ),
    }
  })
  return { rounds, applicants }
}
