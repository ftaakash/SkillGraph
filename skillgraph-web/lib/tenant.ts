/**
 * College workspaces (ADR-001 Phase 4). A college is a tenant: faculty see only their own
 * college's students, jobs and placements; students join with the college's join code.
 *
 * Membership is always read from the database — the session's collegeId is captured at
 * sign-in and goes stale when a student joins or leaves a college.
 */
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { forgetEntitlements } from '@/lib/billing'

// No 0/O/1/I/L — codes are read aloud and typed from posters
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateCode(length = 8) {
  let code = ''
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Codes are created lazily for colleges that predate workspaces. */
export async function ensureWorkspaceCodes(collegeId: string) {
  const college = await prisma.collegeInstitution.findUnique({ where: { id: collegeId } })
  if (!college) return null
  if (college.joinCode && college.facultyInviteCode) return college
  return prisma.collegeInstitution.update({
    where: { id: collegeId },
    data: {
      joinCode: college.joinCode ?? generateCode(),
      facultyInviteCode: college.facultyInviteCode ?? generateCode(10),
    },
  })
}

export async function rotateCode(collegeId: string, which: 'student' | 'faculty') {
  return prisma.collegeInstitution.update({
    where: { id: collegeId },
    data: which === 'student' ? { joinCode: generateCode() } : { facultyInviteCode: generateCode(10) },
  })
}

export type FacultyContext = { userId: string; collegeId: string; isCollegeAdmin: boolean }

/** The signed-in faculty member's workspace, or null if they aren't faculty of a college. */
export async function facultyContext(userId: string): Promise<FacultyContext | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true, isCollegeAdmin: true } })
  if (!user || user.role !== 'FACULTY' || !user.collegeId) return null
  return { userId, collegeId: user.collegeId, isCollegeAdmin: user.isCollegeAdmin }
}

/** The college a student has joined, or null. */
export async function studentCollegeId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true } })
  return user?.role === 'STUDENT' ? user.collegeId : null
}

export async function joinCollege(studentId: string, rawCode: string) {
  const code = normaliseCode(rawCode)
  if (code.length < 6) return null
  const college = await prisma.collegeInstitution.findUnique({ where: { joinCode: code }, select: { id: true, name: true } })
  if (!college) return null
  await prisma.user.update({
    where: { id: studentId },
    data: { collegeId: college.id, college: college.name, collegeJoinedAt: new Date() },
  })
  forgetEntitlements(studentId)
  return college
}

export async function leaveCollege(studentId: string) {
  await prisma.user.update({ where: { id: studentId }, data: { collegeId: null, collegeJoinedAt: null } })
  forgetEntitlements(studentId)
}

/** Students of a college — the only population a faculty member may query. */
export const collegeStudents = (collegeId: string) => ({ role: 'STUDENT' as const, collegeId })

/** A faculty member may only manage applications to their own college's job postings. */
export async function facultyCanManageApplication(ctx: FacultyContext, applicationId: string) {
  const application = await prisma.jobApplication.findUnique({ where: { id: applicationId }, select: { jobPostingId: true } })
  if (!application) return false
  const posting = await prisma.facultyJobPosting.findUnique({ where: { id: application.jobPostingId }, select: { collegeId: true } })
  return posting?.collegeId === ctx.collegeId
}

/** Why a student may not apply to a campus job posting, or null if they may. */
export async function campusApplyBlocker(studentId: string, jobPostingId: string): Promise<string | null> {
  const [collegeId, posting] = await Promise.all([
    studentCollegeId(studentId),
    prisma.facultyJobPosting.findUnique({ where: { id: jobPostingId }, select: { collegeId: true, deadline: true } }),
  ])
  if (!posting || !collegeId || posting.collegeId !== collegeId) return 'Job not found'
  if (posting.deadline < new Date()) return 'Applications for this job have closed'
  return null
}
