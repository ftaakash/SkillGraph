/**
 * College imports (ADR-002 Phase 5): faculty upload CSV exports from their ERP or placement
 * portal. Parsing is pure and returns per-line errors; applying is scoped to the faculty
 * member's own college, so a file can never touch another college's students.
 *
 * Every import supports a dry run, which the UI uses to preview counts and errors first.
 */
import { prisma } from '@/lib/prisma'
import { collegeStudents } from '@/lib/tenant'
import { csvRecords, type CsvRecord } from './csv'
import { calendarDaySchema, courseSchema, type CalendarDay, type CourseData, type MarkComponent } from './types'

export type ImportIssue = { line: number; message: string }
const MAX_REPORTED = 50

function firstIssue(err: { issues: { path: PropertyKey[]; message: string }[] }) {
  const issue = err.issues[0]
  return issue ? `${issue.path.join('.') || 'row'}: ${issue.message}` : 'invalid row'
}

function requireColumns(headers: string[], groups: string[][]) {
  for (const group of groups) {
    if (!group.some(h => headers.includes(h))) {
      throw new ImportError(`Missing column: ${group.join(' or ')}`)
    }
  }
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

// ─── Numbers and dates as they appear in Indian exports ──────────────────────

/** "25K", "25,000", "₹25000" → 25000 */
export function parseRupees(value: string): number | null {
  const v = value.replace(/[₹,\s]/g, '').toLowerCase()
  if (!v) return null
  const m = v.match(/^(\d+(?:\.\d+)?)(k|l|lakh|lpa)?$/)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = m[2]
  return Math.round(unit === 'k' ? n * 1_000 : unit ? n * 100_000 : n)
}

/** CTC in lakhs per annum: "8.5", "8.5 LPA" → 8.5; full rupee amounts such as "850000" are converted. */
export function parseLpa(value: string): number | null {
  const v = value.replace(/[₹,\s]/g, '').toLowerCase().replace(/(lpa|lakhs?|l)$/, '')
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n >= 1000 ? Math.round((n / 100_000) * 100) / 100 : n
}

/**
 * Dates in India time: YYYY-MM-DD or DD/MM/YYYY, optionally followed by HH:mm (24-hour), or
 * a full ISO timestamp with an offset. Date-only values take `defaultTime`.
 */
export function parseIstDateTime(value: string, defaultTime = '23:59'): Date | null {
  const s = value.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m =
    s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/) ??
    s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (!m) return null
  const isoOrder = m[1].length === 4
  const [y, mo, d] = isoOrder ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]]
  const [h, mi] = m[4] ? [m[4], m[5]] : defaultTime.split(':')
  const date = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  const parsed = new Date(`${date}T${h.padStart(2, '0')}:${mi}:00+05:30`)
  // Reject impossible dates such as 31/02 that Date would roll over
  if (Number.isNaN(parsed.getTime()) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return null
  return parsed
}

export function parseIsoDate(value: string): string | null {
  const d = parseIstDateTime(value, '12:00')
  return d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d) : null
}

// ─── Attendance & marks records ──────────────────────────────────────────────

export const RECORDS_TEMPLATE =
  'email,reg_no,course_code,course_title,category,credits,attended,conducted,mark:CT-1/5,mark:CT-2/10\n' +
  'student@college.edu.in,RA2311003010001,21CSC303J,Software Engineering,theory,3,14,22,4.5,\n'

export type RecordRow = { line: number; email: string | null; regNo: string | null; course: CourseData }

const MARK_HEADER = /^mark:\s*(.+?)\s*\/\s*(\d+(?:\.\d+)?)$/i

export function parseRecordsCsv(text: string) {
  const { headers, records } = csvRecords(text)
  requireColumns(headers, [['email', 'reg_no'], ['course_code'], ['course_title'], ['attended'], ['conducted']])

  const rows: RecordRow[] = []
  const errors: ImportIssue[] = []
  for (const r of records) {
    const email = r.values.email?.toLowerCase() || null
    const regNo = r.values.reg_no?.toUpperCase() || null
    if (!email && !regNo) {
      errors.push({ line: r.line, message: 'email or reg_no is required' })
      continue
    }
    const marks = markComponents(r)
    if (typeof marks === 'string') {
      errors.push({ line: r.line, message: marks })
      continue
    }
    const parsed = courseSchema.safeParse({
      code: r.values.course_code,
      title: r.values.course_title,
      category: r.values.category || 'theory',
      credits: r.values.credits || null,
      faculty: r.values.faculty,
      slot: r.values.slot,
      room: r.values.room,
      attended: r.values.attended,
      conducted: r.values.conducted,
      marks,
    })
    if (!parsed.success) {
      errors.push({ line: r.line, message: firstIssue(parsed.error) })
      continue
    }
    rows.push({ line: r.line, email, regNo, course: { ...parsed.data, code: parsed.data.code.toUpperCase() } })
  }
  return { rows, errors }
}

function markComponents(r: CsvRecord): MarkComponent[] | string {
  const marks: MarkComponent[] = []
  for (const [header, value] of Object.entries(r.raw)) {
    const m = header.match(MARK_HEADER)
    if (!m) continue
    const max = Number(m[2])
    if (value === '') {
      marks.push({ name: m[1], scored: null, max })
      continue
    }
    const scored = Number(value)
    if (!Number.isFinite(scored) || scored < 0 || scored > max) return `${m[1]}: "${value}" is not a mark out of ${max}`
    marks.push({ name: m[1], scored, max })
  }
  return marks
}

export async function applyRecordsImport(collegeId: string, rows: RecordRow[], dryRun: boolean) {
  const emails = [...new Set(rows.map(r => r.email).filter((e): e is string => Boolean(e)))]
  const regNos = [...new Set(rows.map(r => r.regNo).filter((n): n is string => Boolean(n)))]
  const students = await prisma.user.findMany({
    where: {
      ...collegeStudents(collegeId),
      OR: [{ email: { in: emails } }, { AcademicProfile: { regNo: { in: regNos } } }],
    },
    select: { id: true, email: true, AcademicProfile: { select: { regNo: true } } },
  })
  const byEmail = new Map(students.map(s => [s.email.toLowerCase(), s.id]))
  const byRegNo = new Map(students.filter(s => s.AcademicProfile?.regNo).map(s => [s.AcademicProfile!.regNo!.toUpperCase(), s.id]))

  const unmatched: ImportIssue[] = []
  const writes: { userId: string; course: CourseData }[] = []
  for (const row of rows) {
    const userId = (row.email && byEmail.get(row.email)) || (row.regNo && byRegNo.get(row.regNo))
    if (!userId) unmatched.push({ line: row.line, message: `${row.email ?? row.regNo} has not joined this college on SkillGraph` })
    else writes.push({ userId, course: row.course })
  }

  if (!dryRun) {
    for (let i = 0; i < writes.length; i += 200) {
      await prisma.$transaction(
        writes.slice(i, i + 200).map(({ userId, course }) =>
          prisma.academicCourse.upsert({
            where: { userId_code_category: { userId, code: course.code, category: course.category } },
            create: { userId, ...course, source: 'college' },
            update: { ...course, source: 'college' },
          }),
        ),
      )
    }
  }
  return {
    courses: writes.length,
    students: new Set(writes.map(w => w.userId)).size,
    unmatched: unmatched.slice(0, MAX_REPORTED),
    unmatchedCount: unmatched.length,
  }
}

// ─── Academic calendar ───────────────────────────────────────────────────────

export const CALENDAR_TEMPLATE = 'date,day_order,label\n2026-10-13,1,\n2026-10-20,,Diwali\n'

export function parseCalendarCsv(text: string) {
  const { headers, records } = csvRecords(text)
  requireColumns(headers, [['date'], ['day_order']])
  const days: CalendarDay[] = []
  const errors: ImportIssue[] = []
  const seen = new Set<string>()
  for (const r of records) {
    const date = parseIsoDate(r.values.date)
    const dayOrder = r.values.day_order.replace(/^d(ay)?\s*/i, '')
    const parsed = calendarDaySchema.safeParse({ date, dayOrder: dayOrder === '' || dayOrder === '-' ? null : dayOrder, label: r.values.label })
    if (!date) errors.push({ line: r.line, message: `"${r.values.date}" is not a date` })
    else if (!parsed.success) errors.push({ line: r.line, message: firstIssue(parsed.error) })
    else if (seen.has(date)) errors.push({ line: r.line, message: `${date} appears more than once` })
    else {
      seen.add(date)
      days.push(parsed.data)
    }
  }
  return { days, errors }
}

export async function applyCalendarImport(collegeId: string, days: CalendarDay[], dryRun: boolean) {
  if (!dryRun) {
    for (let i = 0; i < days.length; i += 200) {
      await prisma.$transaction(
        days.slice(i, i + 200).map(d => {
          const date = new Date(`${d.date}T00:00:00Z`)
          return prisma.collegeCalendarDay.upsert({
            where: { collegeId_date: { collegeId, date } },
            create: { collegeId, date, dayOrder: d.dayOrder, label: d.label },
            update: { dayOrder: d.dayOrder, label: d.label },
          })
        }),
      )
    }
  }
  return { days: days.length }
}

// ─── Placement drives (e.g. an export from Haveloc) ──────────────────────────

export const DRIVES_TEMPLATE =
  'external_ref,company,title,job_type,ctc_min,ctc_max,stipend_min,stipend_max,location,duration,visit_date,visit_mode,apply_by,apply_url,min_cgpa,eligible_branches,description\n' +
  'HV-1024,Acme Corp,Software Engineer Intern,Intern Leads To Full Time,8,12,25000,25000,Chennai,6 months,2026-10-23,physical,2026-10-15 10:00,https://placements.example.com/jobs/1024,7.0,CSE;IT,\n'

const VISIT_MODES: [RegExp, string][] = [
  [/both|hybrid/i, 'both'],
  [/virtual|online|remote/i, 'virtual'],
  [/physical|in.?person|on.?site|campus/i, 'physical'],
  [/not yet|undecided|tbd|tba/i, 'undecided'],
]

export type DriveRow = {
  line: number
  externalRef: string | null
  data: {
    company: string
    title: string
    description: string
    jobType: string | null
    ctcMin: number | null
    ctcMax: number | null
    stipendMin: number | null
    stipendMax: number | null
    location: string | null
    duration: string | null
    driveDate: Date | null
    visitMode: string | null
    deadline: Date
    applyUrl: string | null
    minCgpa: number | null
    eligibleBranches: string[] | null
    source: string
  }
}

export function parseDrivesCsv(text: string) {
  const { headers, records } = csvRecords(text)
  requireColumns(headers, [['company'], ['title', 'role'], ['apply_by', 'deadline']])
  const rows: DriveRow[] = []
  const errors: ImportIssue[] = []
  const refs = new Set<string>()

  for (const r of records) {
    const v = r.values
    const fail = (message: string) => errors.push({ line: r.line, message })
    const company = v.company?.slice(0, 200)
    const title = (v.title || v.role)?.slice(0, 200)
    if (!company || !title) {
      fail('company and title are required')
      continue
    }
    const deadline = parseIstDateTime(v.apply_by || v.deadline || '')
    if (!deadline) {
      fail(`apply_by "${v.apply_by || v.deadline || ''}" is not a date`)
      continue
    }
    const driveDate = v.visit_date ? parseIstDateTime(v.visit_date, '09:00') : null
    if (v.visit_date && !driveDate) {
      fail(`visit_date "${v.visit_date}" is not a date`)
      continue
    }
    const applyUrl = v.apply_url || null
    if (applyUrl && !/^https:\/\/[^\s]+$/i.test(applyUrl)) {
      fail('apply_url must be an https:// link')
      continue
    }
    const nums = {
      ctcMin: v.ctc_min ? parseLpa(v.ctc_min) : null,
      ctcMax: v.ctc_max ? parseLpa(v.ctc_max) : null,
      stipendMin: v.stipend_min ? parseRupees(v.stipend_min) : null,
      stipendMax: v.stipend_max ? parseRupees(v.stipend_max) : null,
      minCgpa: v.min_cgpa ? Number(v.min_cgpa) : null,
    }
    const bad = Object.entries(nums).find(([k, n]) => v[k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)] && (n === null || !Number.isFinite(n)))
    if (bad) {
      fail(`${bad[0]} is not a number`)
      continue
    }
    if (nums.minCgpa !== null && (nums.minCgpa < 0 || nums.minCgpa > 10)) {
      fail('min_cgpa must be between 0 and 10')
      continue
    }
    const externalRef = v.external_ref?.slice(0, 100) || null
    if (externalRef) {
      if (refs.has(externalRef)) {
        fail(`external_ref ${externalRef} appears more than once`)
        continue
      }
      refs.add(externalRef)
    }
    const branches = v.eligible_branches
      ? v.eligible_branches.split(/[;|]/).map(b => b.trim()).filter(Boolean).slice(0, 30)
      : null
    rows.push({
      line: r.line,
      externalRef,
      data: {
        company,
        title,
        description: (v.description || `${title} at ${company}`).slice(0, 20_000),
        jobType: v.job_type?.slice(0, 80) || null,
        ...nums,
        location: v.location?.slice(0, 200) || null,
        duration: v.duration?.slice(0, 80) || null,
        driveDate,
        visitMode: v.visit_mode ? (VISIT_MODES.find(([re]) => re.test(v.visit_mode))?.[1] ?? null) : null,
        deadline,
        applyUrl,
        eligibleBranches: branches?.length ? branches : null,
        source: v.source?.toLowerCase().includes('off') ? 'off_campus' : v.source?.toLowerCase().includes('pool') ? 'pool' : 'on_campus',
      },
    })
  }
  return { rows, errors }
}

export async function applyDrivesImport(collegeId: string, rows: DriveRow[], dryRun: boolean) {
  const refs = rows.map(r => r.externalRef).filter((r): r is string => Boolean(r))
  const existing = new Set(
    (await prisma.facultyJobPosting.findMany({ where: { collegeId, externalRef: { in: refs } }, select: { externalRef: true } }))
      .map(j => j.externalRef),
  )
  const updated = rows.filter(r => r.externalRef && existing.has(r.externalRef)).length

  if (!dryRun) {
    for (let i = 0; i < rows.length; i += 100) {
      await prisma.$transaction(
        rows.slice(i, i + 100).map(({ externalRef, data }) => {
          const fields = { ...data, eligibleBranches: data.eligibleBranches ?? undefined }
          return externalRef
            ? prisma.facultyJobPosting.upsert({
                where: { collegeId_externalRef: { collegeId, externalRef } },
                create: { ...fields, collegeId, externalRef },
                update: fields,
              })
            : prisma.facultyJobPosting.create({ data: { ...fields, collegeId } })
        }),
      )
    }
  }
  return { created: rows.length - updated, updated }
}
