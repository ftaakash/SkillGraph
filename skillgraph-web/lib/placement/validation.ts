import { z } from 'zod'
import { ROUND_KINDS, OUTCOMES, MAX_ATTENDANCE_WINDOW_MIN } from './rounds'

const isoDate = z.string().datetime({ offset: true }).transform(v => new Date(v))

export const roundInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the round').max(120),
    kind: z.enum(ROUND_KINDS).default('other'),
    startsAt: isoDate.nullable().optional(),
    endsAt: isoDate.nullable().optional(),
    mode: z.enum(['physical', 'virtual']).nullable().optional(),
    venue: z.string().trim().max(300).nullable().optional(),
  })
  .refine(r => !r.startsAt || !r.endsAt || r.endsAt > r.startsAt, { message: 'The round must end after it starts', path: ['endsAt'] })

export const roundPatchSchema = z.union([
  z.object({ action: z.literal('open_attendance'), minutes: z.number().int().min(5).max(MAX_ATTENDANCE_WINDOW_MIN) }),
  z.object({ action: z.literal('close_attendance') }),
  z.object({ action: z.literal('update'), round: roundInputSchema }),
])

export const resultsSchema = z
  .object({
    applicationIds: z.array(z.string().min(1).max(40)).min(1).max(1000),
    outcome: z.enum(OUTCOMES).optional(),
    attended: z.boolean().optional(),
  })
  .refine(r => r.outcome !== undefined || r.attended !== undefined, { message: 'Set an outcome or attendance' })

export const NOTICE_CATEGORIES = ['general', 'announcement', 'shortlist', 'result'] as const

export const noticeSchema = z.object({
  title: z.string().trim().min(3, 'Add a title').max(200),
  body: z.string().trim().min(1, 'Write the notice').max(20_000),
  category: z.enum(NOTICE_CATEGORIES).default('general'),
  jobPostingId: z.string().min(1).max(40).nullable().optional(),
})
