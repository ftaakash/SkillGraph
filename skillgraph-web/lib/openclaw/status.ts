/**
 * OpenClaw application lifecycle (assisted apply — the student always submits).
 *
 *   Pending       evaluated from a link/JD the student added
 *   ReadyToApply  prepared by the agent: tailored résumé generated, waiting for the student
 *   Applied …     reported by the student after applying on the employer's site
 *
 * Failed / UnableToApply are legacy values from the retired browser-automation agent.
 */
export const APPLICATION_STATUSES = [
  'Pending', 'ReadyToApply',
  'Applied', 'Viewed', 'Shortlisted', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn', 'Closed',
  'Duplicate', 'Failed', 'UnableToApply',
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

/** Statuses a student may set on their own application. */
export const USER_SETTABLE_STATUSES = [
  'Applied', 'Viewed', 'Shortlisted', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn', 'Closed',
] as const satisfies readonly ApplicationStatus[]

/** Still in flight — used for de-duplication. */
export const OPEN_STATUSES = ['Pending', 'ReadyToApply', 'Applied'] as const satisfies readonly ApplicationStatus[]
