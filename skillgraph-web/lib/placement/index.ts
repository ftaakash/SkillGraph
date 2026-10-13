/**
 * Placement workflow data access (ADR-003 Phase 6): drive access control, the student's
 * tracker and participation lists, and calendar events. Membership is always read from the
 * database (see lib/tenant.ts).
 */
import { prisma } from '@/lib/prisma'
import { applicationProgress, attendanceOpen, canRespond, inRound } from './rounds'

export type DriveAccess =
  | { role: 'student'; userId: string; collegeId: string; jobId: string; applicationId: string }
  | { role: 'faculty'; userId: string; collegeId: string; jobId: string; isCollegeAdmin: boolean }

/**
 * Who may see a drive's chat and rounds: students who applied to it at their own college, and
 * faculty of the drive's college. Everyone else gets null (callers answer 404).
 */
export async function driveAccess(userId: string, jobId: string): Promise<DriveAccess | null> {
  const [user, job] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true, isCollegeAdmin: true } }),
    prisma.facultyJobPosting.findUnique({ where: { id: jobId }, select: { id: true, collegeId: true } }),
  ])
  if (!user || !job?.collegeId || user.collegeId !== job.collegeId) return null
  if (user.role === 'FACULTY') {
    return { role: 'faculty', userId, collegeId: job.collegeId, jobId: job.id, isCollegeAdmin: user.isCollegeAdmin }
  }
  if (user.role !== 'STUDENT') return null
  const application = await prisma.jobApplication.findFirst({ where: { userId, jobPostingId: job.id }, select: { id: true } })
  return application ? { role: 'student', userId, collegeId: job.collegeId, jobId: job.id, applicationId: application.id } : null
}

const roundSelect = {
  id: true, position: true, name: true, kind: true, startsAt: true, endsAt: true, mode: true, venue: true,
  attendanceCode: true, attendanceUntil: true,
} as const

/** Public view of a round: never includes the check-in code itself */
export function publicRound(r: {
  id: string; position: number; name: string; kind: string; startsAt: Date | null; endsAt: Date | null
  mode: string | null; venue: string | null; attendanceCode: string | null; attendanceUntil: Date | null
}, now = new Date()) {
  return {
    id: r.id, position: r.position, name: r.name, kind: r.kind, startsAt: r.startsAt, endsAt: r.endsAt,
    mode: r.mode, venue: r.venue, attendanceUntil: r.attendanceUntil, attendanceOpen: attendanceOpen(r, now),
  }
}

/** Every application of a student with its drive and round-by-round progress. */
export async function studentTracker(userId: string, now = new Date()) {
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    include: { roundResults: true },
    orderBy: { appliedAt: 'desc' },
  })
  const jobs = await prisma.facultyJobPosting.findMany({
    where: { id: { in: applications.map(a => a.jobPostingId) } },
    select: {
      id: true, title: true, company: true, jobType: true, deadline: true, driveDate: true, collegeId: true,
      rounds: { select: roundSelect, orderBy: { position: 'asc' } },
    },
  })
  const byId = new Map(jobs.map(j => [j.id, j]))

  return applications.flatMap(app => {
    const job = byId.get(app.jobPostingId)
    if (!job) return []
    const progress = applicationProgress(job.rounds, app.roundResults, app.status)
    return [{
      applicationId: app.id,
      status: app.status,
      channel: app.channel,
      appliedAt: app.appliedAt,
      job: { id: job.id, title: job.title, company: job.company, jobType: job.jobType, deadline: job.deadline, driveDate: job.driveDate },
      offered: progress.offered,
      eliminated: progress.eliminated,
      steps: progress.steps.map(s => ({
        round: publicRound(s.round, now),
        state: s.state,
        confirmation: s.result?.confirmation ?? 'pending',
        attendedAt: s.result?.attendedAt ?? null,
      })),
    }]
  })
}

/**
 * Rounds a student is still in, with what they can do now: confirm or decline (until 15 minutes
 * before the start) and check in (while faculty have attendance open).
 */
export async function studentParticipation(userId: string, now = new Date()) {
  const tracker = await studentTracker(userId, now)
  return tracker.flatMap(app =>
    app.steps
      .filter(s => s.state === 'pending' || s.state === 'upcoming')
      .map(s => ({
        applicationId: app.applicationId,
        job: app.job,
        round: s.round,
        confirmation: s.confirmation,
        attendedAt: s.attendedAt,
        canRespond: canRespond(s.round, now),
        canCheckIn: s.round.attendanceOpen && !s.attendedAt && s.confirmation !== 'declined',
        // A round's slot has passed when it has ended, or started more than a day ago without an end time
        past: Boolean(
          (s.round.endsAt && s.round.endsAt < now) ||
          (!s.round.endsAt && s.round.startsAt && s.round.startsAt.getTime() < now.getTime() - 24 * 3600_000),
        ),
      })),
  )
}

/** Loads one round with everything needed to check a student's eligibility for it. */
export async function roundForStudent(userId: string, roundId: string) {
  const round = await prisma.driveRound.findUnique({
    where: { id: roundId },
    include: { jobPosting: { select: { id: true, collegeId: true, rounds: { select: roundSelect } } } },
  })
  if (!round) return null
  const access = await driveAccess(userId, round.jobPostingId)
  if (access?.role !== 'student') return null
  const application = await prisma.jobApplication.findUnique({
    where: { id: access.applicationId },
    include: { roundResults: true },
  })
  if (!application) return null
  return {
    round,
    application,
    eligible: inRound(round, round.jobPosting.rounds, application.roundResults, application.status),
  }
}

export type CalendarEvent = {
  id: string
  kind: 'round' | 'visit' | 'deadline'
  title: string
  subtitle: string | null
  start: Date
  end: Date | null
  jobId: string
}

/**
 * Placement events between two dates. Students see rounds of drives they are still in, visit
 * dates of drives they applied to, and apply-by deadlines of open drives at their college.
 * Faculty see every round, visit and deadline of their college.
 */
export async function calendarEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true } })
  if (!user?.collegeId || (user.role !== 'STUDENT' && user.role !== 'FACULTY')) return []
  const collegeId = user.collegeId
  const faculty = user.role === 'FACULTY'

  const jobs = await prisma.facultyJobPosting.findMany({
    where: {
      collegeId,
      OR: [
        { deadline: { gte: from, lte: to } },
        { driveDate: { gte: from, lte: to } },
        { rounds: { some: { startsAt: { gte: from, lte: to } } } },
      ],
    },
    select: {
      id: true, title: true, company: true, deadline: true, driveDate: true,
      rounds: { select: roundSelect, orderBy: { position: 'asc' } },
    },
  })

  const applications = faculty
    ? []
    : await prisma.jobApplication.findMany({
        where: { userId, jobPostingId: { in: jobs.map(j => j.id) } },
        include: { roundResults: true },
      })
  const appByJob = new Map(applications.map(a => [a.jobPostingId, a]))
  const within = (d: Date | null): d is Date => Boolean(d && d >= from && d <= to)

  const events: CalendarEvent[] = []
  for (const job of jobs) {
    const app = appByJob.get(job.id)
    const label = `${job.company} · ${job.title}`
    if (within(job.deadline) && (faculty || !app)) {
      events.push({ id: `deadline-${job.id}`, kind: 'deadline', title: `Apply by: ${job.company}`, subtitle: job.title, start: job.deadline, end: null, jobId: job.id })
    }
    if (within(job.driveDate) && (faculty || app)) {
      events.push({ id: `visit-${job.id}`, kind: 'visit', title: `${job.company} visit`, subtitle: job.title, start: job.driveDate, end: null, jobId: job.id })
    }
    const progress = app ? applicationProgress(job.rounds, app.roundResults, app.status) : null
    for (const round of job.rounds) {
      if (!within(round.startsAt)) continue
      const state = progress?.steps.find(s => s.round.id === round.id)?.state
      if (!faculty && state !== 'pending' && state !== 'upcoming' && state !== 'cleared') continue
      events.push({
        id: `round-${round.id}`, kind: 'round', title: `${job.company} · Round ${round.position}: ${round.name}`,
        subtitle: [round.mode, round.venue].filter(Boolean).join(' · ') || label, start: round.startsAt, end: round.endsAt, jobId: job.id,
      })
    }
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}
