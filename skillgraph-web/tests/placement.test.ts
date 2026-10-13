import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applicationProgress, inRound, canRespond, attendanceOpen, attendanceCodeMatches, CONFIRM_CUTOFF_MS } from '@/lib/placement/rounds'
import { roundInputSchema, roundPatchSchema, resultsSchema, noticeSchema } from '@/lib/placement/validation'
import { publicRound } from '@/lib/placement'

const rounds = [
  { id: 'r3', position: 3, startsAt: null },
  { id: 'r1', position: 1, startsAt: null },
  { id: 'r2', position: 2, startsAt: null },
]
const result = (roundId: string, outcome: string) => ({ roundId, outcome, confirmation: 'pending', attendedAt: null })

test('progress walks rounds in order: first undecided round is current, later ones upcoming', () => {
  const p = applicationProgress(rounds, [], 'Applied')
  assert.deepEqual(p.steps.map(s => [s.round.id, s.state]), [['r1', 'pending'], ['r2', 'upcoming'], ['r3', 'upcoming']])
  assert.equal(p.currentRoundId, 'r1')
  assert.equal(p.eliminated, false)

  const cleared = applicationProgress(rounds, [result('r1', 'cleared')], 'Shortlisted')
  assert.deepEqual(cleared.steps.map(s => s.state), ['cleared', 'pending', 'upcoming'])
  assert.equal(cleared.currentRoundId, 'r2')
})

test('a rejection or absence ends the process for later rounds', () => {
  for (const outcome of ['rejected', 'absent']) {
    const p = applicationProgress(rounds, [result('r1', 'cleared'), result('r2', outcome)], 'Applied')
    assert.deepEqual(p.steps.map(s => s.state), ['cleared', outcome, 'not_reached'])
    assert.equal(p.eliminated, true)
    assert.equal(p.currentRoundId, null)
    assert.equal(inRound(rounds[0], rounds, [result('r1', 'cleared'), result('r2', outcome)], 'Applied'), false)
  }
  // A rejected application is out of every undecided round
  const rejected = applicationProgress(rounds, [result('r1', 'cleared')], 'Rejected')
  assert.deepEqual(rejected.steps.map(s => s.state), ['cleared', 'not_reached', 'not_reached'])
  assert.equal(inRound(rounds[1], rounds, [], 'Rejected'), false)
})

test('offers are recognised and later rounds stay reachable', () => {
  const p = applicationProgress(rounds, [result('r1', 'cleared'), result('r2', 'cleared'), result('r3', 'cleared')], 'Offered')
  assert.equal(p.offered, true)
  assert.equal(p.eliminated, false)
  assert.equal(inRound(rounds[2], rounds, [], 'Applied'), true) // r3 is upcoming
})

test('responses close 15 minutes before a round; rounds without a time stay open', () => {
  const now = new Date('2026-10-13T10:00:00Z')
  assert.equal(canRespond({ startsAt: null }, now), true)
  assert.equal(canRespond({ startsAt: new Date(now.getTime() + CONFIRM_CUTOFF_MS + 1000) }, now), true)
  assert.equal(canRespond({ startsAt: new Date(now.getTime() + CONFIRM_CUTOFF_MS) }, now), false)
  assert.equal(canRespond({ startsAt: new Date(now.getTime() - 1000) }, now), false)
})

test('check-in needs an open window and the exact code, ignoring case and spacing', () => {
  const now = new Date('2026-10-13T10:00:00Z')
  const open = { attendanceCode: 'K7MP2Q', attendanceUntil: new Date(now.getTime() + 60_000) }
  assert.equal(attendanceOpen(open, now), true)
  assert.equal(attendanceOpen({ ...open, attendanceUntil: new Date(now.getTime() - 1) }, now), false)
  assert.equal(attendanceOpen({ attendanceCode: null, attendanceUntil: null }, now), false)

  assert.equal(attendanceCodeMatches('K7MP2Q', ' k7m p2q '), true)
  assert.equal(attendanceCodeMatches('K7MP2Q', 'K7MP2R'), false)
  assert.equal(attendanceCodeMatches('K7MP2Q', 'K7MP2'), false)
  assert.equal(attendanceCodeMatches('K7MP2Q', ''), false)
})

test('student-facing rounds never include the check-in code', () => {
  const now = new Date('2026-10-13T10:00:00Z')
  const shown = publicRound({
    id: 'r', position: 1, name: 'Test', kind: 'test', startsAt: null, endsAt: null, mode: null, venue: null,
    attendanceCode: 'SECRET', attendanceUntil: new Date(now.getTime() + 60_000),
  }, now)
  assert.equal(JSON.stringify(shown).includes('SECRET'), false)
  assert.equal(shown.attendanceOpen, true)
})

test('faculty inputs are validated', () => {
  const ok = roundInputSchema.safeParse({ name: ' Online test ', kind: 'test', startsAt: '2026-10-16T08:30:00+05:30', endsAt: '2026-10-16T10:00:00+05:30', mode: 'physical' })
  assert.equal(ok.success, true)
  if (ok.success) {
    assert.equal(ok.data.name, 'Online test')
    assert.ok(ok.data.startsAt instanceof Date)
  }
  assert.equal(roundInputSchema.safeParse({ name: 'X', startsAt: '2026-10-16T10:00:00Z', endsAt: '2026-10-16T09:00:00Z' }).success, false)
  assert.equal(roundInputSchema.safeParse({ name: 'X', kind: 'karaoke' }).success, false)

  assert.equal(roundPatchSchema.safeParse({ action: 'open_attendance', minutes: 60 }).success, true)
  assert.equal(roundPatchSchema.safeParse({ action: 'open_attendance', minutes: 600 }).success, false)
  assert.equal(resultsSchema.safeParse({ applicationIds: ['a'] }).success, false, 'needs an outcome or attendance')
  assert.equal(resultsSchema.safeParse({ applicationIds: ['a'], outcome: 'cleared' }).success, true)
  assert.equal(resultsSchema.safeParse({ applicationIds: ['a'], outcome: 'hired' }).success, false)
  assert.equal(noticeSchema.safeParse({ title: 'Hi', body: 'x' }).success, false, 'title too short')
  assert.equal(noticeSchema.safeParse({ title: 'Shortlist', body: 'PFA', category: 'shortlist' }).success, true)
})

test('clearing a later round implies the earlier unmarked ones were passed', () => {
  const p = applicationProgress(rounds, [result('r2', 'cleared')], 'Applied')
  assert.deepEqual(p.steps.map(s => s.state), ['cleared', 'cleared', 'pending'])
  assert.equal(p.currentRoundId, 'r3')
  // An explicit rejection earlier still wins
  const q = applicationProgress(rounds, [result('r1', 'rejected'), result('r2', 'cleared')], 'Applied')
  assert.equal(q.steps[0].state, 'rejected')
  assert.equal(q.eliminated, true)
})
