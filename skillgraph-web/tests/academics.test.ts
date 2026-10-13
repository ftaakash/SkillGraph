import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import {
  attendanceStatus, classesRequired, classesCanMiss, overallAttendance, marksTotal, projectAttendance, nextClass, istDate, addDays,
} from '@/lib/academics/calc'
import { seal, unseal } from '@/lib/academics/crypto'
import { parseCsv, csvRecords, CsvError } from '@/lib/academics/csv'
import {
  parseRecordsCsv, parseCalendarCsv, parseDrivesCsv, parseIstDateTime, parseLpa, parseRupees, ImportError,
} from '@/lib/academics/imports'
import { academicDataSchema, type TimetableEntry, type CalendarDay } from '@/lib/academics/types'
import { srmApiProvider, srmAcademiaProvider, availableProviders } from '@/lib/academics/providers'

// ─── Attendance arithmetic ───────────────────────────────────────────────────

test('required / can-miss match the 75% rule (values observed in a reference student portal)', () => {
  // attended, conducted → required to reach 75%, or classes that can be missed
  assert.equal(classesRequired(6, 14), 18)
  assert.equal(classesRequired(14, 22), 10)
  assert.equal(classesRequired(4, 14), 26)
  assert.equal(classesCanMiss(17, 22), 0)
  assert.equal(classesCanMiss(14, 17), 1)
  assert.equal(classesCanMiss(12, 12), 4)

  const s = attendanceStatus(6, 14)
  assert.equal(s.safe, false)
  assert.equal(s.margin, 0)
  assert.equal(Number(s.percent.toFixed(1)), 42.9)
  // Exactly at the threshold is safe with nothing to spare
  assert.deepEqual(attendanceStatus(3, 4), { percent: 75, safe: true, required: 0, margin: 0 })
  // No classes yet: nothing required
  assert.deepEqual(attendanceStatus(0, 0), { percent: 100, safe: true, required: 0, margin: 0 })
})

test('the required count actually reaches the threshold and one fewer does not', () => {
  for (let c = 1; c <= 60; c++) {
    for (let a = 0; a <= c; a++) {
      const x = classesRequired(a, c)
      assert.ok(100 * (a + x) >= 75 * (c + x), `${a}/${c} +${x}`)
      if (x > 0) assert.ok(100 * (a + x - 1) < 75 * (c + x - 1), `${a}/${c} +${x - 1}`)
      const m = classesCanMiss(a, c)
      if (100 * a >= 75 * c) {
        assert.ok(100 * a >= 75 * (c + m))
        assert.ok(100 * a < 75 * (c + m + 1))
      }
    }
  }
})

test('overall attendance and marks totals', () => {
  const o = overallAttendance([{ attended: 6, conducted: 14 }, { attended: 17, conducted: 22 }, { attended: 0, conducted: 0 }])
  assert.equal(o.attended, 23)
  assert.equal(o.conducted, 36)
  assert.equal(o.below, 1)

  const t = marksTotal([{ name: 'CT-1', scored: 4.5, max: 5 }, { name: 'CT-2', scored: null, max: 10 }])
  assert.deepEqual(t, { scored: 4.5, max: 5, percent: 90, published: 1 })
  assert.equal(marksTotal([]).percent, null)
})

// ─── Day orders, next class and projections ──────────────────────────────────

const timetable: TimetableEntry[] = [
  { dayOrder: 1, start: '08:00', end: '08:50', courseCode: 'CS101', category: 'theory', title: 'Compilers', room: 'LH1' },
  { dayOrder: 1, start: '08:50', end: '09:40', courseCode: 'CS101', category: 'theory', title: 'Compilers', room: 'LH1' },
  { dayOrder: 2, start: '10:00', end: '10:50', courseCode: 'CS102', category: 'practical', title: 'Lab', room: null },
]
const calendar: CalendarDay[] = [
  { date: '2026-10-13', dayOrder: 1, label: null },
  { date: '2026-10-14', dayOrder: 2, label: null },
  { date: '2026-10-15', dayOrder: null, label: 'Holiday' },
  { date: '2026-10-16', dayOrder: 1, label: null },
]

test('dates are taken in India time', () => {
  // 20:00 UTC on the 12th is 01:30 on the 13th in India
  assert.equal(istDate(new Date('2026-10-12T20:00:00Z')), '2026-10-13')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('nextClass finds the next period today, else on the next working day order', () => {
  // 08:30 IST on a day-order-1 day → the 08:50 period
  const morning = nextClass(timetable, calendar, new Date('2026-10-13T03:00:00Z'))
  assert.equal(morning?.entry.start, '08:50')
  // Evening → tomorrow (day order 2)
  const evening = nextClass(timetable, calendar, new Date('2026-10-13T12:00:00Z'))
  assert.deepEqual([evening?.date, evening?.entry.courseCode], ['2026-10-14', 'CS102'])
  assert.equal(nextClass(timetable, [], new Date()), null)
})

test('projections count missed days as conducted only, and OD/ML days as attended', () => {
  const courses = [
    { code: 'CS101', category: 'theory', attended: 6, conducted: 8 },
    { code: 'CS102', category: 'practical', attended: 2, conducted: 2 },
  ]
  // Miss the 16th (day order 1: two CS101 periods); attend the 13th and 14th; the 15th is a holiday
  const p = projectAttendance({ courses, timetable, calendar, from: '2026-10-13', until: '2026-10-16', absent: ['2026-10-16'], leaves: [] })
  const cs101 = p.find(c => c.code === 'CS101')!
  assert.deepEqual([cs101.attended, cs101.conducted], [8, 12])
  assert.ok(cs101.change < 0)
  const lab = p.find(c => c.code === 'CS102')!
  assert.deepEqual([lab.attended, lab.conducted], [3, 3])

  // The same missed day saved as OD counts as attended
  const od = projectAttendance({ courses, timetable, calendar, from: '2026-10-13', until: '2026-10-16', absent: ['2026-10-16'], leaves: ['2026-10-16'] })
  assert.deepEqual([od[0].attended, od[0].conducted], [10, 12])

  // A past OD day credits back classes the record shows as missed, capped at conducted
  const past = projectAttendance({ courses, timetable, calendar: [...calendar, { date: '2026-10-12', dayOrder: 1, label: null }], from: '2026-10-13', until: '2026-10-12', absent: [], leaves: ['2026-10-12'] })
  assert.deepEqual([past[0].attended, past[0].conducted], [8, 8])
  assert.deepEqual([past[1].attended, past[1].conducted], [2, 2])
})

// ─── Encryption of stored portal sessions ────────────────────────────────────

test('sessions are encrypted, bound to the user and tamper-evident', () => {
  process.env.ACADEMIC_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  const sealed = seal('cookie=secret', 'user-a')
  assert.ok(!sealed.includes('secret'))
  assert.equal(unseal(sealed, 'user-a'), 'cookie=secret')
  assert.equal(unseal(sealed, 'user-b'), null, 'ciphertext moved to another user')
  const parts = sealed.split('.')
  parts[3] = Buffer.from('cookie=forged').toString('base64url')
  assert.equal(unseal(parts.join('.'), 'user-a'), null)
  assert.notEqual(seal('x', 'u'), seal('x', 'u'), 'fresh IV each time')

  process.env.ACADEMIC_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  assert.equal(unseal(sealed, 'user-a'), null, 'rotated key')
  delete process.env.ACADEMIC_ENCRYPTION_KEY
  assert.throws(() => seal('x', 'u'), { name: 'AcademicProviderError' })
})

// ─── Providers ───────────────────────────────────────────────────────────────

test('providers are unavailable until configured; the portal connector stays off without its transport', async () => {
  delete process.env.SRM_API_BASE_URL
  delete process.env.SRM_API_KEY
  process.env.SRM_ACADEMIA_CONNECTOR = 'enabled'
  process.env.ACADEMIC_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  assert.deepEqual(availableProviders(), [])
  assert.equal(srmAcademiaProvider.available(), false)
  await assert.rejects(srmAcademiaProvider.connect({ userId: 'u', email: 'a@srmist.edu.in', emailVerified: true }, { login: 'a', password: 'p' }), { code: 'not_configured' })

  process.env.SRM_API_BASE_URL = 'https://api.example.edu'
  process.env.SRM_API_KEY = 'k'
  assert.deepEqual(availableProviders().map(p => p.id), ['srm_api'])
  delete process.env.SRM_ACADEMIA_CONNECTOR
  delete process.env.ACADEMIC_ENCRYPTION_KEY
})

test('the official API only accepts a verified university email', async () => {
  process.env.SRM_EMAIL_DOMAIN = 'srmist.edu.in'
  const reject = (email: string, emailVerified: boolean) =>
    assert.rejects(srmApiProvider.connect({ userId: 'u', email, emailVerified }, {}), { code: 'not_eligible' })
  await reject('ab1234@gmail.com', true)
  await reject('ab1234@srmist.edu.in', false)
  await reject('ab1234@evil-srmist.edu.in.example.com', true)
  const ok = await srmApiProvider.connect({ userId: 'u', email: 'AB1234@SRMIST.edu.in', emailVerified: true }, {})
  assert.deepEqual(ok, { externalId: 'ab1234@srmist.edu.in', session: null })
})

test('provider data is validated before it is stored', () => {
  const good = academicDataSchema.safeParse({
    courses: [{ code: '21CSC303J', title: 'Software Engineering', category: 'Lab', attended: '14', conducted: 22, marks: [{ name: 'FT-I', scored: '4', max: 5 }] }],
  })
  assert.equal(good.success, true)
  if (good.success) {
    assert.equal(good.data.courses[0].category, 'practical')
    assert.equal(good.data.courses[0].attended, 14)
    assert.deepEqual(good.data.timetable, [])
    assert.equal(good.data.student.regNo, null)
  }
  assert.equal(academicDataSchema.safeParse({ courses: [{ code: 'X', title: 'Y', category: 'theory', attended: 5, conducted: 4 }] }).success, false)
  assert.equal(academicDataSchema.safeParse({ courses: [], timetable: [{ dayOrder: 1, start: '25:00', end: '09:00', courseCode: 'X', category: 'theory', title: 'Y' }] }).success, false)
})

// ─── CSV imports ─────────────────────────────────────────────────────────────

test('CSV parser handles quotes, embedded commas/newlines, CRLF and BOM', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\n"multi\nline",2\n\n'), [
    ['a', 'b'],
    ['x, y', 'he said "hi"'],
    ['multi\nline', '2'],
  ])
  assert.throws(() => parseCsv('a\n"unterminated'), CsvError)
  assert.throws(() => csvRecords('only,a,header'), CsvError)
  const { headers, records } = csvRecords('Course Code,Reg-No\nCS1,RA1\n')
  assert.deepEqual(headers, ['course_code', 'reg_no'])
  assert.equal(records[0].line, 2)
})

test('records import validates each row and reads mark columns', () => {
  const csv = [
    'email,reg_no,course_code,course_title,category,credits,attended,conducted,mark:CT-1/5,mark:CT-2/10',
    'A@College.edu,,cs101,Compilers,theory,3,14,22,4.5,',
    ',RA2311,CS102,Lab,practical,2,3,2,,',
    'b@college.edu,,CS103,Networks,theory,3,10,12,6,',
    ',,CS104,Nobody,theory,3,1,1,,',
  ].join('\n')
  const { rows, errors } = parseRecordsCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].email, 'a@college.edu')
  assert.equal(rows[0].course.code, 'CS101')
  assert.deepEqual(rows[0].course.marks, [{ name: 'CT-1', scored: 4.5, max: 5 }, { name: 'CT-2', scored: null, max: 10 }])
  assert.deepEqual(errors.map(e => e.line), [3, 4, 5])
  assert.match(errors[0].message, /attended cannot exceed conducted/)
  assert.match(errors[1].message, /CT-1.*out of 5/)
  assert.throws(() => parseRecordsCsv('name,score\nx,1\n'), ImportError)
})

test('calendar import accepts D1 / 1 / blank day orders and rejects duplicates', () => {
  const { days, errors } = parseCalendarCsv('date,day_order,label\n2026-10-13,D1,\n13/10/2026,2,\n2026-10-20,,Diwali\n2026-02-30,1,\n2026-10-21,9,\n')
  assert.deepEqual(days, [
    { date: '2026-10-13', dayOrder: 1, label: null },
    { date: '2026-10-20', dayOrder: null, label: 'Diwali' },
  ])
  assert.deepEqual(errors.map(e => e.line), [3, 5, 6])
})

test('Indian amounts and dates', () => {
  assert.equal(parseRupees('25K'), 25000)
  assert.equal(parseRupees('₹25,000'), 25000)
  assert.equal(parseRupees('abc'), null)
  assert.equal(parseLpa('8.5 LPA'), 8.5)
  assert.equal(parseLpa('850000'), 8.5)
  assert.equal(parseIstDateTime('2026-10-13 10:00')?.toISOString(), '2026-10-13T04:30:00.000Z')
  assert.equal(parseIstDateTime('13/10/2026')?.toISOString(), '2026-10-13T18:29:00.000Z') // end of day IST
  assert.equal(parseIstDateTime('2026-10-13T10:00:00Z')?.toISOString(), '2026-10-13T10:00:00.000Z')
  assert.equal(parseIstDateTime('31/02/2026'), null)
  assert.equal(parseIstDateTime('next tuesday'), null)
})

test('drive import parses portal exports and rejects unsafe or malformed rows', () => {
  const csv = [
    'external_ref,company,title,job_type,ctc_min,ctc_max,stipend_min,stipend_max,location,duration,visit_date,visit_mode,apply_by,apply_url,min_cgpa,eligible_branches',
    'HV-1,Acme,SDE Intern,Intern Leads To Full Time,8,12,25K,25K,Chennai,6 months,2026-10-23,Physically,2026-10-15 10:00,https://portal.example.com/1,7,CSE;IT',
    'HV-2,Beta,Analyst,,,,,,,,,Not Yet Decided,2026-10-16,javascript:alert(1),,',
    'HV-1,Dup,Again,,,,,,,,,,2026-10-16,,,',
    'HV-3,Gamma,Role,,eight,,,,,,,,2026-10-16,,,',
    ',Delta,Role,,,,,,,,,,soon,,,',
  ].join('\n')
  const { rows, errors } = parseDrivesCsv(csv)
  assert.equal(rows.length, 1)
  const d = rows[0].data
  assert.equal(rows[0].externalRef, 'HV-1')
  assert.deepEqual([d.ctcMin, d.ctcMax, d.stipendMin, d.visitMode, d.minCgpa], [8, 12, 25000, 'physical', 7])
  assert.deepEqual(d.eligibleBranches, ['CSE', 'IT'])
  assert.equal(d.deadline.toISOString(), '2026-10-15T04:30:00.000Z')
  assert.deepEqual(errors.map(e => e.line), [3, 4, 5, 6])
  assert.match(errors[0].message, /https/)
  assert.match(errors[1].message, /more than once/)
  assert.match(errors[2].message, /ctcMin/)
})

test('projections skip classes that already started today', () => {
  const courses = [{ code: 'CS101', category: 'theory', attended: 6, conducted: 8 }]
  // Day order 1 has CS101 at 08:00 and 08:50; at 08:30 only the 08:50 period is still ahead
  const p = projectAttendance({ courses, timetable, calendar, from: '2026-10-13', until: '2026-10-13', absent: [], leaves: [], nowMinutes: 8 * 60 + 30 })
  assert.deepEqual([p[0].attended, p[0].conducted], [7, 9])
  const evening = projectAttendance({ courses, timetable, calendar, from: '2026-10-13', until: '2026-10-13', absent: [], leaves: [], nowMinutes: 18 * 60 })
  assert.deepEqual([evening[0].attended, evening[0].conducted], [6, 8])
})
