/**
 * Hiring-round rules (ADR-003 Phase 6). Pure functions shared by API routes and pages.
 *
 * A student takes part in a round until they are eliminated: their application is rejected,
 * or an earlier round marked them rejected or absent. Outcomes are recorded by the placement
 * cell; students confirm participation and check in.
 */
import { timingSafeEqual } from 'crypto'

export const ROUND_KINDS = ['screening', 'ppt', 'test', 'gd', 'technical', 'hr', 'other'] as const
export type RoundKind = (typeof ROUND_KINDS)[number]
export const ROUND_KIND_LABEL: Record<RoundKind, string> = {
  screening: 'Application screening',
  ppt: 'Pre-placement talk',
  test: 'Test',
  gd: 'Group discussion',
  technical: 'Technical interview',
  hr: 'HR interview',
  other: 'Round',
}

export const OUTCOMES = ['pending', 'cleared', 'rejected', 'absent'] as const
export type Outcome = (typeof OUTCOMES)[number]
export const CONFIRMATIONS = ['pending', 'confirmed', 'declined'] as const
export type Confirmation = (typeof CONFIRMATIONS)[number]

/** Students can confirm or decline until this long before a round starts */
export const CONFIRM_CUTOFF_MS = 15 * 60 * 1000
/** Longest check-in window faculty can open */
export const MAX_ATTENDANCE_WINDOW_MIN = 180

/** Application statuses that end a student's process */
export const FINAL_REJECTED = new Set(['Rejected'])
export const OFFER_STATUSES = new Set(['Offered', 'Placed'])

type RoundLike = { id: string; position: number; startsAt: Date | null; endsAt?: Date | null }
type ResultLike = { roundId: string; outcome: string; confirmation: string; attendedAt: Date | null }

export function canRespond(round: { startsAt: Date | null }, now: Date) {
  return !round.startsAt || now.getTime() < round.startsAt.getTime() - CONFIRM_CUTOFF_MS
}

export function attendanceOpen(round: { attendanceCode: string | null; attendanceUntil: Date | null }, now: Date) {
  return Boolean(round.attendanceCode && round.attendanceUntil && round.attendanceUntil.getTime() > now.getTime())
}

export const normaliseAttendanceCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Constant-time comparison so codes can't be guessed character by character */
export function attendanceCodeMatches(expected: string, given: string) {
  const a = Buffer.from(normaliseAttendanceCode(expected))
  const b = Buffer.from(normaliseAttendanceCode(given))
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

export type RoundState =
  | 'cleared'
  | 'rejected'
  | 'absent'
  | 'pending' // the student's current round, awaiting an outcome
  | 'upcoming' // a later round the student hasn't reached yet
  | 'not_reached' // the student was eliminated before this round

/** Each round's state for one application, in order, plus where the student stands. */
export function applicationProgress<R extends RoundLike>(rounds: R[], results: ResultLike[], applicationStatus: string) {
  const sorted = [...rounds].sort((a, b) => a.position - b.position)
  const byRound = new Map(results.map(r => [r.roundId, r]))
  let eliminated = FINAL_REJECTED.has(applicationStatus)
  let current: string | null = null

  const steps = sorted.map(round => {
    const result = byRound.get(round.id) ?? null
    const outcome = (result?.outcome ?? 'pending') as Outcome
    let state: RoundState
    if (outcome !== 'pending') {
      state = outcome
    } else if (eliminated) {
      state = 'not_reached'
    } else if (current === null) {
      state = 'pending'
      current = round.id
    } else {
      state = 'upcoming'
    }
    if (outcome === 'rejected' || outcome === 'absent') eliminated = true
    return { round, result, state }
  })

  return {
    steps,
    currentRoundId: eliminated ? null : current,
    eliminated,
    offered: OFFER_STATUSES.has(applicationStatus),
  }
}

/** Whether an application is still in the process for a given round (can confirm / check in). */
export function inRound<R extends RoundLike>(round: R, rounds: R[], results: ResultLike[], applicationStatus: string) {
  const step = applicationProgress(rounds, results, applicationStatus).steps.find(s => s.round.id === round.id)
  return step ? step.state === 'pending' || step.state === 'upcoming' : false
}
