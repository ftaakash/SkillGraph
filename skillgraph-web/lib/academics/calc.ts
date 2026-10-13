/**
 * Attendance and marks arithmetic (ADR-002 Phase 5). Pure functions shared by the API and
 * the browser, so projections run client-side without a round trip.
 *
 * Indian universities commonly require 75% attendance per course; thresholds are whole
 * percentages so the arithmetic stays exact in integers.
 */
import type { CalendarDay, CourseCategory, MarkComponent, TimetableEntry } from './types'

export const DEFAULT_THRESHOLD = 75
export const TIMEZONE = 'Asia/Kolkata'
export const MAX_PROJECTION_DAYS = 200

export function attendancePercent(attended: number, conducted: number) {
  return conducted > 0 ? (attended / conducted) * 100 : 100
}

/** Consecutive classes to attend to reach the threshold: smallest x with (a+x)/(c+x) ≥ t. */
export function classesRequired(attended: number, conducted: number, threshold = DEFAULT_THRESHOLD) {
  if (threshold >= 100) return attended === conducted ? 0 : Infinity
  return Math.max(0, Math.ceil((threshold * conducted - 100 * attended) / (100 - threshold)))
}

/** Classes that can be missed while staying at the threshold: largest m with a/(c+m) ≥ t. */
export function classesCanMiss(attended: number, conducted: number, threshold = DEFAULT_THRESHOLD) {
  if (threshold <= 0) return Infinity
  return Math.max(0, Math.floor((100 * attended - threshold * conducted) / threshold))
}

export type AttendanceStatus = {
  percent: number
  safe: boolean
  required: number // classes to attend to reach the threshold (0 when safe)
  margin: number // classes that can be missed while staying safe (0 when below)
}

export function attendanceStatus(attended: number, conducted: number, threshold = DEFAULT_THRESHOLD): AttendanceStatus {
  const percent = attendancePercent(attended, conducted)
  const safe = 100 * attended >= threshold * conducted
  return {
    percent,
    safe,
    required: safe ? 0 : classesRequired(attended, conducted, threshold),
    margin: safe ? classesCanMiss(attended, conducted, threshold) : 0,
  }
}

export function overallAttendance(courses: { attended: number; conducted: number }[], threshold = DEFAULT_THRESHOLD) {
  const attended = courses.reduce((n, c) => n + c.attended, 0)
  const conducted = courses.reduce((n, c) => n + c.conducted, 0)
  const below = courses.filter(c => c.conducted > 0 && 100 * c.attended < threshold * c.conducted).length
  return { attended, conducted, percent: attendancePercent(attended, conducted), below }
}

/** Total of the published components; unpublished ones (scored = null) are left out of both sides. */
export function marksTotal(marks: MarkComponent[]) {
  const published = marks.filter(m => m.scored !== null)
  const scored = published.reduce((n, m) => n + (m.scored ?? 0), 0)
  const max = published.reduce((n, m) => n + m.max, 0)
  return { scored, max, percent: max > 0 ? (scored / max) * 100 : null, published: published.length }
}

// ─── Dates, day orders and timetables ────────────────────────────────────────

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** The calendar date (YYYY-MM-DD) in India for an instant. */
export function istDate(at: Date) {
  return dateFormat.format(at)
}

/** Minutes since midnight in India for an instant. */
export function istMinutes(at: Date) {
  const [h, m] = timeFormat.format(at).split(':').map(Number)
  return h * 60 + m
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dayOrderOn(calendar: CalendarDay[], date: string) {
  return calendar.find(d => d.date === date)?.dayOrder ?? null
}

export type ClassKey = string
export const classKey = (code: string, category: CourseCategory | string): ClassKey => `${code.toUpperCase()}|${category}`

/** Periods each course has on each day order, e.g. { 1: { 'CS101|theory': 2 } }. */
export function periodsByDayOrder(timetable: TimetableEntry[]) {
  const map = new Map<number, Map<ClassKey, number>>()
  for (const entry of timetable) {
    const day = map.get(entry.dayOrder) ?? new Map<ClassKey, number>()
    const key = classKey(entry.courseCode, entry.category)
    day.set(key, (day.get(key) ?? 0) + 1)
    map.set(entry.dayOrder, day)
  }
  return map
}

/** The next class from `now` within the coming two weeks of the calendar. */
export function nextClass(timetable: TimetableEntry[], calendar: CalendarDay[], now: Date) {
  const today = istDate(now)
  const minutes = istMinutes(now)
  for (let offset = 0; offset < 14; offset++) {
    const date = addDays(today, offset)
    const dayOrder = dayOrderOn(calendar, date)
    if (!dayOrder) continue
    const upcoming = timetable
      .filter(e => e.dayOrder === dayOrder && (offset > 0 || toMinutes(e.start) > minutes))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    if (upcoming.length) return { date, dayOrder, entry: upcoming[0] }
  }
  return null
}

// ─── Projections ("what if I miss these days?") ──────────────────────────────

export type ProjectionInput = {
  courses: { code: string; category: string; attended: number; conducted: number }[]
  timetable: TimetableEntry[]
  calendar: CalendarDay[]
  /** First day to project (normally today), YYYY-MM-DD */
  from: string
  /** Last day to project, inclusive */
  until: string
  /** Days in the window the student expects to miss */
  absent: string[]
  /**
   * On-duty / medical-leave dates. Past ones credit the classes that day as attended, until
   * the university's record reflects the approval; future ones count as attended.
   */
  leaves: string[]
  threshold?: number
}

export type CourseProjection = AttendanceStatus & {
  code: string
  category: string
  attended: number
  conducted: number
  /** Percentage points gained or lost against the current figure */
  change: number
}

export function projectAttendance(input: ProjectionInput): CourseProjection[] {
  const threshold = input.threshold ?? DEFAULT_THRESHOLD
  const periods = periodsByDayOrder(input.timetable)
  const absent = new Set(input.absent)
  const leaves = new Set(input.leaves)
  const calendar = new Map(input.calendar.map(d => [d.date, d.dayOrder]))

  const totals = new Map(input.courses.map(c => [classKey(c.code, c.category), { attended: c.attended, conducted: c.conducted }]))
  const credit = (date: string, attendedOnly: boolean) => {
    const dayOrder = calendar.get(date)
    if (!dayOrder) return
    for (const [key, n] of periods.get(dayOrder) ?? []) {
      const t = totals.get(key)
      if (!t) continue
      if (attendedOnly) {
        t.attended = Math.min(t.conducted, t.attended + n)
      } else {
        t.conducted += n
        if (!absent.has(date) || leaves.has(date)) t.attended += n
      }
    }
  }

  // Past leave days were recorded as absences; credit them back
  for (const date of leaves) if (date < input.from) credit(date, true)
  // A semester at most; bounds the loop for arbitrary input
  for (let date = input.from, i = 0; date <= input.until && i < MAX_PROJECTION_DAYS; date = addDays(date, 1), i++) {
    credit(date, false)
  }

  return input.courses.map(c => {
    const t = totals.get(classKey(c.code, c.category))!
    const status = attendanceStatus(t.attended, t.conducted, threshold)
    return {
      code: c.code,
      category: c.category,
      attended: t.attended,
      conducted: t.conducted,
      ...status,
      change: status.percent - attendancePercent(c.attended, c.conducted),
    }
  })
}
