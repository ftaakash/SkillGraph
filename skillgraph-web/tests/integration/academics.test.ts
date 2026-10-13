/**
 * Database integration tests for academics and placement drives (ADR-002 Phase 5).
 * Same requirements as isolation.test.ts: TEST_DATABASE_URL on a disposable local Postgres.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { generateCode } from '@/lib/tenant'
import { parseRecordsCsv, applyRecordsImport, parseDrivesCsv, applyDrivesImport, parseCalendarCsv, applyCalendarImport } from '@/lib/academics/imports'
import { persistAcademicData, academicOverview, disconnectAcademics } from '@/lib/academics/sync'

const url = process.env.TEST_DATABASE_URL
const safe = Boolean(url && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(url))
const skip = !safe && 'set TEST_DATABASE_URL to a local disposable database to run integration tests'

const run = randomUUID().slice(0, 8)
const ids = { users: [] as string[], colleges: [] as string[] }

async function college(name: string) {
  const c = await prisma.collegeInstitution.create({
    data: { name: `${name} ${run}`, city: 'Test', state: 'TS', tier: 'Tier-1', tpContactEmail: 'tp@test.local', joinCode: generateCode(), facultyInviteCode: generateCode(10) },
  })
  ids.colleges.push(c.id)
  return c
}

async function student(collegeId: string | null) {
  const u = await prisma.user.create({
    data: { name: `Student ${run}`, email: `s-${randomUUID()}@test.local`, passwordHash: 'x', role: 'STUDENT', collegeId, collegeJoinedAt: collegeId ? new Date() : null },
  })
  ids.users.push(u.id)
  return u
}

const course = (code: string, attended: number, conducted: number) => ({
  code, title: `Course ${code}`, category: 'theory' as const, credits: 3, faculty: null, slot: null, room: null, attended, conducted, marks: [],
})

describe('integration: academics', { skip }, () => {
  let A: Awaited<ReturnType<typeof college>>, B: Awaited<ReturnType<typeof college>>

  before(async () => {
    A = await college('Academics A')
    B = await college('Academics B')
  })

  after(async () => {
    await prisma.jobApplication.deleteMany({ where: { userId: { in: ids.users } } })
    await prisma.facultyJobPosting.deleteMany({ where: { collegeId: { in: ids.colleges } } })
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } }) // cascades academic rows
    await prisma.collegeInstitution.deleteMany({ where: { id: { in: ids.colleges } } }) // cascades calendar days
    await prisma.$disconnect()
  })

  test('a records import only reaches students of the importing college', async () => {
    const mine = await student(A.id)
    const other = await student(B.id)
    const unjoined = await student(null)
    const csv = [
      'email,course_code,course_title,attended,conducted',
      `${mine.email},CS101,Compilers,6,14`,
      `${other.email},CS101,Compilers,1,14`,
      `${unjoined.email},CS101,Compilers,1,14`,
    ].join('\n')
    const { rows } = parseRecordsCsv(csv)

    const preview = await applyRecordsImport(A.id, rows, true)
    assert.equal(preview.courses, 1)
    assert.equal(preview.unmatchedCount, 2)
    assert.equal(await prisma.academicCourse.count({ where: { userId: { in: [mine.id, other.id, unjoined.id] } } }), 0, 'dry run writes nothing')

    await applyRecordsImport(A.id, rows, false)
    assert.equal(await prisma.academicCourse.count({ where: { userId: mine.id } }), 1)
    assert.equal(await prisma.academicCourse.count({ where: { userId: { in: [other.id, unjoined.id] } } }), 0)

    // Re-importing updates in place
    await applyRecordsImport(A.id, parseRecordsCsv(`email,course_code,course_title,attended,conducted\n${mine.email},cs101,Compilers,7,15`).rows, false)
    const updated = await prisma.academicCourse.findMany({ where: { userId: mine.id } })
    assert.equal(updated.length, 1)
    assert.deepEqual([updated[0].attended, updated[0].conducted, updated[0].source], [7, 15, 'college'])
  })

  test('a sync replaces its own courses but leaves college-imported ones alone', async () => {
    const s = await student(A.id)
    await prisma.academicCourse.create({ data: { userId: s.id, ...course('COL1', 5, 5), source: 'college' } })
    await persistAcademicData(s.id, 'srm_api', { student: { regNo: 'ra1', name: null, program: null, department: null, semester: 3, section: null, batch: null }, courses: [course('API1', 1, 2), course('API2', 2, 2)], timetable: [], calendar: [] })
    await persistAcademicData(s.id, 'srm_api', { student: { regNo: 'RA1', name: null, program: null, department: null, semester: 3, section: null, batch: null }, courses: [course('API2', 3, 3)], timetable: [], calendar: [] })

    const codes = (await prisma.academicCourse.findMany({ where: { userId: s.id }, orderBy: { code: 'asc' } })).map(c => c.code)
    assert.deepEqual(codes, ['API2', 'COL1'])
    assert.equal((await prisma.academicProfile.findUnique({ where: { userId: s.id } }))?.regNo, 'RA1')

    await disconnectAcademics(s.id, { deleteData: true })
    assert.deepEqual((await prisma.academicCourse.findMany({ where: { userId: s.id } })).map(c => c.code), ['COL1'])
    assert.equal(await prisma.academicProfile.count({ where: { userId: s.id } }), 0)
  })

  test("students without a synced calendar see their college's", async () => {
    const s = await student(A.id)
    await applyCalendarImport(A.id, parseCalendarCsv('date,day_order,label\n2026-10-13,1,\n2026-10-14,,Holiday\n').days, false)
    await applyCalendarImport(B.id, parseCalendarCsv('date,day_order\n2026-10-13,4\n').days, false)
    const overview = await academicOverview(s.id, new Date('2026-10-13T03:00:00Z'))
    assert.equal(overview.today.dayOrder, 1)
    assert.equal(overview.calendar.length, 2)
  })

  test('drive imports are idempotent per external reference and scoped to the college', async () => {
    const header = 'external_ref,company,title,apply_by,ctc_min'
    const first = parseDrivesCsv(`${header}\nHV-${run},Acme,SDE,2030-01-01 10:00,8\n,Beta,Analyst,2030-01-02,5`).rows
    assert.deepEqual(await applyDrivesImport(A.id, first, false), { created: 2, updated: 0 })
    const again = parseDrivesCsv(`${header}\nHV-${run},Acme,SDE II,2030-01-01 10:00,9`).rows
    assert.deepEqual(await applyDrivesImport(A.id, again, false), { created: 0, updated: 1 })
    // The same reference in another college is a different drive
    assert.deepEqual(await applyDrivesImport(B.id, again, false), { created: 1, updated: 0 })

    const acme = await prisma.facultyJobPosting.findMany({ where: { collegeId: A.id, externalRef: `HV-${run}` } })
    assert.equal(acme.length, 1)
    assert.deepEqual([acme[0].title, acme[0].ctcMin], ['SDE II', 9])
  })
})
