/**
 * Database integration tests for the placement workflow (ADR-003 Phase 6): who can see a drive,
 * round participation, check-in and the faculty view. Same requirements as isolation.test.ts.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { generateCode } from '@/lib/tenant'
import { driveAccess, studentTracker, studentParticipation, roundForStudent, calendarEvents } from '@/lib/placement'
import { facultyJob, facultyRound, driveOverview } from '@/lib/placement/faculty'

const url = process.env.TEST_DATABASE_URL
const safe = Boolean(url && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(url))
const skip = !safe && 'set TEST_DATABASE_URL to a local disposable database to run integration tests'

const run = randomUUID().slice(0, 8)
const ids = { users: [] as string[], colleges: [] as string[] }

async function college() {
  const c = await prisma.collegeInstitution.create({
    data: { name: `Placement ${run}`, city: 'Test', state: 'TS', tier: 'Tier-1', tpContactEmail: 'tp@test.local', joinCode: generateCode(), facultyInviteCode: generateCode(10) },
  })
  ids.colleges.push(c.id)
  return c
}

async function user(role: 'STUDENT' | 'FACULTY', collegeId: string) {
  const u = await prisma.user.create({
    data: { name: `${role} ${run}`, email: `${role.toLowerCase()}-${randomUUID()}@test.local`, passwordHash: 'x', role, collegeId, collegeJoinedAt: new Date() },
  })
  ids.users.push(u.id)
  return u
}

const hour = 3600_000

describe('integration: placement workflow', { skip }, () => {
  let A: Awaited<ReturnType<typeof college>>, B: Awaited<ReturnType<typeof college>>
  let facultyA: Awaited<ReturnType<typeof user>>, facultyB: Awaited<ReturnType<typeof user>>
  let applicant: Awaited<ReturnType<typeof user>>, bystander: Awaited<ReturnType<typeof user>>, outsider: Awaited<ReturnType<typeof user>>
  let jobId: string, appId: string, r1: string, r2: string

  before(async () => {
    A = await college()
    B = await college()
    facultyA = await user('FACULTY', A.id)
    facultyB = await user('FACULTY', B.id)
    applicant = await user('STUDENT', A.id)
    bystander = await user('STUDENT', A.id)
    outsider = await user('STUDENT', B.id)

    const now = Date.now()
    const job = await prisma.facultyJobPosting.create({
      data: { collegeId: A.id, title: `SDE ${run}`, company: 'Acme', description: 'x', deadline: new Date(now + 48 * hour), driveDate: new Date(now + 72 * hour) },
    })
    jobId = job.id
    appId = (await prisma.jobApplication.create({ data: { userId: applicant.id, jobPostingId: job.id } })).id
    r1 = (await prisma.driveRound.create({
      data: { jobPostingId: job.id, position: 1, name: 'Test', kind: 'test', startsAt: new Date(now + 2 * hour), attendanceCode: 'K7MP2Q', attendanceUntil: new Date(now + hour) },
    })).id
    r2 = (await prisma.driveRound.create({ data: { jobPostingId: job.id, position: 2, name: 'Interview', kind: 'technical', startsAt: new Date(now + 24 * hour) } })).id
  })

  after(async () => {
    await prisma.jobApplication.deleteMany({ where: { userId: { in: ids.users } } }) // cascades round results
    await prisma.facultyJobPosting.deleteMany({ where: { collegeId: { in: ids.colleges } } }) // cascades rounds, messages
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
    await prisma.collegeInstitution.deleteMany({ where: { id: { in: ids.colleges } } })
    await prisma.$disconnect()
  })

  test('only applicants and the college faculty can open a drive', async () => {
    assert.equal((await driveAccess(applicant.id, jobId))?.role, 'student')
    assert.equal((await driveAccess(facultyA.id, jobId))?.role, 'faculty')
    assert.equal(await driveAccess(bystander.id, jobId), null, 'same college, not applied')
    assert.equal(await driveAccess(outsider.id, jobId), null, 'other college')
    assert.equal(await driveAccess(facultyB.id, jobId), null, 'other college faculty')
    assert.equal(await facultyJob(facultyB.id, jobId), null)
    assert.equal(await facultyRound(facultyB.id, r1), null)
    assert.ok(await facultyRound(facultyA.id, r1))
  })

  test('students only reach rounds of drives they are in', async () => {
    const found = await roundForStudent(applicant.id, r1)
    assert.equal(found?.eligible, true)
    assert.equal(await roundForStudent(bystander.id, r1), null)
    assert.equal(await roundForStudent(outsider.id, r1), null)
  })

  test('participation lists open check-ins and never exposes the code', async () => {
    const items = await studentParticipation(applicant.id)
    const first = items.find(i => i.round.id === r1)!
    assert.equal(first.canCheckIn, true)
    assert.equal(first.canRespond, true)
    assert.equal(JSON.stringify(items).includes('K7MP2Q'), false)
    assert.equal(JSON.stringify(await studentTracker(applicant.id)).includes('K7MP2Q'), false)
  })

  test('a rejection removes the student from later rounds, the tracker and the faculty view agree', async () => {
    await prisma.roundResult.create({ data: { roundId: r1, applicationId: appId, outcome: 'rejected' } })
    const tracker = await studentTracker(applicant.id)
    assert.deepEqual(tracker[0].steps.map(s => s.state), ['rejected', 'not_reached'])
    assert.equal((await roundForStudent(applicant.id, r2))?.eligible, false)
    assert.equal((await studentParticipation(applicant.id)).length, 0)

    const overview = await driveOverview(jobId)
    assert.equal(overview.applicants[0].eliminated, true)
    assert.equal(overview.rounds[0].attendanceCode, 'K7MP2Q', 'faculty see the code')
    await prisma.roundResult.deleteMany({ where: { applicationId: appId } })
  })

  test('calendar shows students their rounds and faculty everything at their college', async () => {
    const from = new Date(Date.now() - hour)
    const to = new Date(Date.now() + 96 * hour)
    const mine = await calendarEvents(applicant.id, from, to)
    assert.deepEqual(mine.filter(e => e.jobId === jobId).map(e => e.kind).sort(), ['round', 'round', 'visit'])
    const other = await calendarEvents(bystander.id, from, to)
    assert.deepEqual(other.filter(e => e.jobId === jobId).map(e => e.kind), ['deadline'], 'not applied: only the apply-by deadline')
    assert.equal((await calendarEvents(outsider.id, from, to)).some(e => e.jobId === jobId), false)
    const faculty = await calendarEvents(facultyA.id, from, to)
    assert.deepEqual(faculty.filter(e => e.jobId === jobId).map(e => e.kind).sort(), ['deadline', 'round', 'round', 'visit'])
  })
})
