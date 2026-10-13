/**
 * Data-subject rights (India DPDP Act 2023 / GDPR): export and erasure of a user's data.
 * Keep this file in sync when adding user-linked models to prisma/schema.prisma.
 */
import { prisma } from '@/lib/prisma'
import { deletePrivateFile } from '@/lib/storage'
import { logger } from '@/lib/log'

/** Everything SkillGraph holds about a user, as a JSON-serialisable object. */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, college: true, branch: true, year: true,
      targetRole: true, cgpa: true, linkedin: true, github: true, readinessScore: true,
      readinessScorePrev: true, sprintsCompleted: true, optimizerSessions: true, isProfileVisible: true,
      emailVerifiedAt: true, termsAcceptedAt: true, termsVersion: true, createdAt: true, updatedAt: true,
      College: { select: { name: true, city: true, state: true } },
      Company: { select: { name: true, website: true } },
      skills: true,
      gaps: true,
      sprints: true,
      optimizerSessions_: true,
      ResumeVersions: true,
      Applications: { include: { roundResults: true } },
      OpenClawConfig: true,
      OpenClawApplications: { include: { listing: true } },
      InterviewStories: true,
      NegotiationScripts: true,
      Notifications: true,
      AiUsage: { select: { feature: true, model: true, promptTokens: true, completionTokens: true, success: true, createdAt: true } },
      TalentViews: { select: { viewedAt: true, shortlisted: true, revealStatus: true, requestedAt: true, respondedAt: true } },
      // The encrypted portal session is a credential, not personal data about the user — never exported
      AcademicConnection: { select: { provider: true, externalId: true, status: true, consentAt: true, lastSyncAt: true, createdAt: true } },
      AcademicProfile: true,
      AcademicCourses: true,
      AttendanceLeaves: true,
      DriveMessages: { where: { deletedAt: null }, select: { jobPostingId: true, body: true, createdAt: true } },
      NoticeReads: { select: { noticeId: true, readAt: true } },
    },
  })
  if (!user) return null

  const applicationIds = user.OpenClawApplications.map(a => a.id)
  const resumeVersionIds = user.ResumeVersions.map(v => v.id)
  const [evaluations, resumeSections, placements] = await Promise.all([
    prisma.evaluationResult.findMany({ where: { applicationId: { in: applicationIds } } }),
    prisma.resumeSection.findMany({ where: { resumeVersionId: { in: resumeVersionIds } } }),
    prisma.placementRecord.findMany({ where: { studentId: userId } }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    format: 'skillgraph-user-export/v1',
    note: 'Stored files (résumés, screenshots) are referenced by storage keys; download them from the app while signed in.',
    account: user,
    evaluations,
    resumeSections,
    placementRecords: placements,
  }
}

/**
 * Permanently deletes the user, everything linked to them, and their stored files.
 * Anonymous aggregates (Benchmark) contain no user id and are kept.
 */
export async function deleteUserAccount(userId: string) {
  const [user, versions, apps] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { resumeUrl: true } }),
    prisma.resumeVersion.findMany({ where: { userId }, select: { id: true, cloudinaryUrl: true } }),
    prisma.openClawApplication.findMany({ where: { userId }, select: { id: true, screenshotUrl: true } }),
  ])
  if (!user) return false

  const fileRefs = [user.resumeUrl, ...versions.map(v => v.cloudinaryUrl), ...apps.map(a => a.screenshotUrl)]
    .filter((r): r is string => Boolean(r))

  // Rows without a cascading relation to User are removed explicitly, then the user (cascades the rest)
  await prisma.$transaction([
    prisma.evaluationResult.deleteMany({ where: { applicationId: { in: apps.map(a => a.id) } } }),
    prisma.resumeSection.deleteMany({ where: { resumeVersionId: { in: versions.map(v => v.id) } } }),
    prisma.recruiterTalentView.deleteMany({ where: { recruiterId: userId } }),
    prisma.placementRecord.deleteMany({ where: { studentId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])

  // Files last: if a delete fails the account is already gone, and the orphan is logged for cleanup
  const results = await Promise.all(fileRefs.map(ref => deletePrivateFile(ref).then(ok => ({ ref, ok }))))
  const failed = results.filter(r => !r.ok && !/^https:\/\//.test(r.ref))
  if (failed.length > 0) logger.warn('account.file_cleanup_incomplete', { userId, failed: failed.map(f => f.ref) })
  logger.info('account.deleted', { userId, files: fileRefs.length })
  return true
}
