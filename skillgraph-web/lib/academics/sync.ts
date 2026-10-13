/**
 * Connecting, syncing and disconnecting a student's university record (ADR-002 Phase 5).
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/log'
import { seal, unseal } from './crypto'
import { PROVIDERS, availableProviders, type ProviderUser } from './providers'
import { overallAttendance, attendanceStatus, marksTotal, istDate, nextClass, dayOrderOn, DEFAULT_THRESHOLD } from './calc'
import {
  AcademicProviderError,
  academicDataSchema,
  calendarDaySchema,
  markComponentSchema,
  timetableEntrySchema,
  type AcademicData,
  type AcademicSource,
  type CalendarDay,
  type ProviderId,
  type TimetableEntry,
} from './types'
import { z } from 'zod'

/** Students can resync at most this often; every sync hits the university's systems */
export const SYNC_COOLDOWN_MS = 10 * 60 * 1000

async function providerUser(userId: string): Promise<ProviderUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true, role: true } })
  if (!user || user.role !== 'STUDENT') throw new AcademicProviderError('not_eligible', 'Only student accounts can connect a university record.')
  return { userId, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) }
}

export async function connectAcademics(userId: string, providerId: ProviderId, input: { login?: string; password?: string }) {
  const provider = PROVIDERS[providerId]
  if (!provider?.available()) throw new AcademicProviderError('not_configured', 'This connection is not available yet.')
  const user = await providerUser(userId)

  const { externalId, session } = await provider.connect(user, input)
  const fields = {
    provider: providerId,
    externalId,
    status: 'active',
    sessionCiphertext: session ? seal(session.data, userId) : null,
    sessionExpiresAt: session?.expiresAt ?? null,
    consentAt: new Date(),
    lastError: null,
    lastSyncAt: null,
  }
  await prisma.academicConnection.upsert({ where: { userId }, create: { userId, ...fields }, update: fields })
  return syncAcademics(userId, { force: true })
}

export async function syncAcademics(userId: string, { force = false } = {}) {
  const connection = await prisma.academicConnection.findUnique({ where: { userId } })
  if (!connection) throw new AcademicProviderError('not_eligible', 'Connect your university record first.')
  if (!force && connection.lastSyncAt && Date.now() - connection.lastSyncAt.getTime() < SYNC_COOLDOWN_MS) {
    const wait = Math.ceil((SYNC_COOLDOWN_MS - (Date.now() - connection.lastSyncAt.getTime())) / 60_000)
    return { synced: false as const, reason: `Synced recently — try again in ${wait} min.` }
  }

  const provider = PROVIDERS[connection.provider as ProviderId]
  if (!provider?.available()) throw new AcademicProviderError('not_configured', 'This connection is not available right now.')
  const user = await providerUser(userId)
  const session = connection.sessionCiphertext ? unseal(connection.sessionCiphertext, userId) : null

  try {
    const raw = await provider.fetch(user, { externalId: connection.externalId, session })
    const parsed = academicDataSchema.safeParse(raw)
    if (!parsed.success) {
      logger.error('academics.invalid_provider_data', { provider: provider.id, issue: parsed.error.issues[0]?.message })
      throw new AcademicProviderError('invalid_data', 'The university returned data SkillGraph could not read. We have been notified.')
    }
    await persistAcademicData(userId, provider.id, parsed.data)
    await prisma.academicConnection.update({ where: { userId }, data: { status: 'active', lastSyncAt: new Date(), lastError: null } })
    return { synced: true as const }
  } catch (err) {
    if (err instanceof AcademicProviderError) {
      const reauth = err.code === 'reauth_required' || err.code === 'invalid_credentials'
      await prisma.academicConnection.update({
        where: { userId },
        data: {
          status: reauth ? 'needs_reauth' : 'error',
          lastError: err.message,
          // An expired session is useless; drop it rather than keep ciphertext around
          ...(reauth ? { sessionCiphertext: null, sessionExpiresAt: null } : {}),
        },
      })
    }
    throw err
  }
}

/** Replaces the student's record from one source; courses that source no longer lists are removed. */
export async function persistAcademicData(userId: string, source: AcademicSource, data: AcademicData) {
  const now = new Date()
  const keep = data.courses.map(c => ({ code: c.code.toUpperCase(), category: c.category }))
  await prisma.$transaction([
    prisma.academicProfile.upsert({
      where: { userId },
      create: { userId, ...profileFields(data), source, syncedAt: now },
      update: { ...profileFields(data), source, syncedAt: now },
    }),
    prisma.academicCourse.deleteMany({
      where: { userId, source, NOT: keep.length ? { OR: keep } : undefined },
    }),
    ...data.courses.map(c => {
      const course = { ...c, code: c.code.toUpperCase(), marks: c.marks as Prisma.InputJsonValue, source }
      return prisma.academicCourse.upsert({
        where: { userId_code_category: { userId, code: course.code, category: course.category } },
        create: { userId, ...course },
        update: course,
      })
    }),
  ])
}

function profileFields(data: AcademicData) {
  const { regNo, program, department, semester, section, batch } = data.student
  return {
    regNo: regNo?.toUpperCase() ?? null,
    program,
    department,
    semester,
    section,
    batch,
    timetable: data.timetable as Prisma.InputJsonValue,
    calendar: data.calendar as Prisma.InputJsonValue,
  }
}

export async function disconnectAcademics(userId: string, { deleteData }: { deleteData: boolean }) {
  await prisma.$transaction([
    prisma.academicConnection.deleteMany({ where: { userId } }),
    ...(deleteData
      ? [
          prisma.academicCourse.deleteMany({ where: { userId, source: { not: 'college' } } }),
          prisma.academicProfile.deleteMany({ where: { userId } }),
        ]
      : []),
  ])
}

// ─── Reading ─────────────────────────────────────────────────────────────────

const storedArray = <T>(schema: z.ZodType<T>, value: unknown): T[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap(v => {
    const r = schema.safeParse(v)
    return r.success ? [r.data] : []
  })
}

/** Everything the Academics page shows, with attendance figures already computed. */
export async function academicOverview(userId: string, now = new Date()) {
  const [user, connection, profile, courses, leaves] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { collegeId: true, role: true } }),
    prisma.academicConnection.findUnique({
      where: { userId },
      select: { provider: true, externalId: true, status: true, lastSyncAt: true, lastError: true, consentAt: true },
    }),
    prisma.academicProfile.findUnique({ where: { userId } }),
    prisma.academicCourse.findMany({ where: { userId }, orderBy: [{ category: 'asc' }, { title: 'asc' }] }),
    prisma.attendanceLeave.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
  ])

  const timetable: TimetableEntry[] = storedArray(timetableEntrySchema, profile?.timetable)
  let calendar: CalendarDay[] = storedArray(calendarDaySchema, profile?.calendar)
  // Students without a synced calendar use the one their college imported
  if (!calendar.length && user?.role === 'STUDENT' && user.collegeId) {
    const days = await prisma.collegeCalendarDay.findMany({ where: { collegeId: user.collegeId }, orderBy: { date: 'asc' } })
    calendar = days.map(d => ({ date: d.date.toISOString().slice(0, 10), dayOrder: d.dayOrder, label: d.label }))
  }

  const today = istDate(now)
  const list = courses.map(c => {
    const marks = storedArray(markComponentSchema, c.marks)
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      category: c.category,
      credits: c.credits,
      faculty: c.faculty,
      slot: c.slot,
      room: c.room,
      attended: c.attended,
      conducted: c.conducted,
      source: c.source,
      updatedAt: c.updatedAt,
      attendance: attendanceStatus(c.attended, c.conducted),
      marks,
      marksTotal: marksTotal(marks),
    }
  })

  return {
    threshold: DEFAULT_THRESHOLD,
    providers: availableProviders(),
    connection,
    profile: profile
      ? { regNo: profile.regNo, program: profile.program, department: profile.department, semester: profile.semester, section: profile.section, batch: profile.batch, syncedAt: profile.syncedAt, source: profile.source }
      : null,
    today: { date: today, dayOrder: dayOrderOn(calendar, today) },
    nextClass: nextClass(timetable, calendar, now),
    overall: overallAttendance(list),
    courses: list,
    timetable,
    calendar,
    leaves: leaves.map(l => ({ date: l.date.toISOString().slice(0, 10), kind: l.kind })),
  }
}

export type AcademicOverview = Awaited<ReturnType<typeof academicOverview>>
