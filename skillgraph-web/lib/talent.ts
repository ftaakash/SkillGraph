/**
 * Recruiter ↔ student talent views with mutual-consent identity reveal (ADR-001 Phase 3).
 *
 *   none ──(recruiter requests)──► requested ──(student accepts)──► accepted   identity shared
 *                                             └─(student declines)─► declined  identity never shared
 *
 * Every recruiter-facing response goes through `presentStudent`, which masks identity
 * unless the student accepted that specific recruiter's request.
 */
import { prisma } from '@/lib/prisma'

export type RevealStatus = 'none' | 'requested' | 'accepted' | 'declined'

/** A declined request can't be re-sent by the same recruiter for this long. */
export const DECLINE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

export const STUDENT_FIELDS = {
  id: true, name: true, email: true, college: true, branch: true, year: true,
  readinessScore: true, targetRole: true, linkedin: true, github: true,
} as const

type StudentRow = {
  id: string
  name: string
  email: string
  college: string | null
  branch: string | null
  year: string | null
  readinessScore: number | null
  targetRole: string | null
  linkedin: string | null
  github: string | null
}

export function anonymousLabel(studentId: string) {
  return `Candidate SG-${studentId.substring(0, 6).toUpperCase()}`
}

/** Student data as a recruiter may see it. */
export function presentStudent(student: StudentRow, revealStatus: string) {
  const revealed = revealStatus === 'accepted'
  return {
    id: student.id,
    name: revealed ? student.name : anonymousLabel(student.id),
    email: revealed ? student.email : null,
    college: revealed ? student.college : null,
    linkedin: revealed ? student.linkedin : null,
    github: revealed ? student.github : null,
    branch: student.branch,
    year: student.year,
    readinessScore: student.readinessScore,
    targetRole: student.targetRole,
    revealed,
  }
}

/** Shortlisted views for a recruiter, with identity masked per consent. */
export async function listShortlist(recruiterId: string) {
  const views = await prisma.recruiterTalentView.findMany({
    where: { recruiterId, shortlisted: true },
    include: { student: { select: STUDENT_FIELDS } },
    orderBy: { viewedAt: 'desc' },
  })
  return views.map(v => ({
    id: v.id,
    shortlisted: v.shortlisted,
    notes: v.notes,
    viewedAt: v.viewedAt,
    revealStatus: v.revealStatus as RevealStatus,
    requestedAt: v.requestedAt,
    respondedAt: v.respondedAt,
    student: presentStudent(v.student, v.revealStatus),
  }))
}

/** Only opted-in students can be shortlisted or contacted. */
export async function findDiscoverableStudent(studentId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, isProfileVisible: true },
  })
  return student && student.role === 'STUDENT' && student.isProfileVisible ? student : null
}
