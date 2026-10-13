/**
 * Academic data shapes (ADR-002 Phase 5). Every provider — the university's official API,
 * the portal connector or a college CSV import — produces an AcademicData value, which is
 * validated here before anything is stored. Provider output is untrusted input.
 */
import { z } from 'zod'

export const PROVIDER_IDS = ['srm_api', 'srm_academia'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]
export type AcademicSource = ProviderId | 'college'

const trimmed = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform(v => (v ? v : null))
const count = z.coerce.number().int().min(0).max(10_000)

export const courseCategorySchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(v => (/^(p|lab|practical)/.test(v) ? 'practical' : 'theory'))
export type CourseCategory = 'theory' | 'practical'

export const markComponentSchema = z.object({
  name: trimmed(60),
  // null = not yet published
  scored: z.coerce.number().min(0).max(1000).nullable(),
  max: z.coerce.number().positive().max(1000),
})
export type MarkComponent = z.infer<typeof markComponentSchema>

export const courseSchema = z
  .object({
    code: trimmed(30),
    title: trimmed(200),
    category: courseCategorySchema,
    credits: z.coerce.number().min(0).max(40).nullish().transform(v => v ?? null),
    faculty: optionalText(200),
    slot: optionalText(30),
    room: optionalText(60),
    attended: count,
    conducted: count,
    marks: z.array(markComponentSchema).max(30).default([]),
  })
  .refine(c => c.attended <= c.conducted, { message: 'attended cannot exceed conducted' })
export type CourseData = z.infer<typeof courseSchema>

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

export const timetableEntrySchema = z.object({
  dayOrder: z.coerce.number().int().min(1).max(7),
  start: time,
  end: time,
  courseCode: trimmed(30),
  category: courseCategorySchema,
  title: trimmed(200),
  room: optionalText(60),
})
export type TimetableEntry = z.infer<typeof timetableEntrySchema>

export const calendarDaySchema = z.object({
  date: isoDate,
  dayOrder: z.coerce.number().int().min(1).max(7).nullable(),
  label: optionalText(120),
})
export type CalendarDay = z.infer<typeof calendarDaySchema>

export const studentDetailsSchema = z.object({
  regNo: optionalText(30),
  name: optionalText(120),
  program: optionalText(120),
  department: optionalText(120),
  semester: z.coerce.number().int().min(1).max(12).nullish().transform(v => v ?? null),
  section: optionalText(30),
  batch: optionalText(30),
})
export type StudentDetails = z.infer<typeof studentDetailsSchema>

export const academicDataSchema = z.object({
  student: studentDetailsSchema.optional().transform(s => s ?? studentDetailsSchema.parse({})),
  courses: z.array(courseSchema).max(60),
  timetable: z.array(timetableEntrySchema).max(400).default([]),
  calendar: z.array(calendarDaySchema).max(800).default([]),
})
export type AcademicData = z.infer<typeof academicDataSchema>

export type ProviderErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'reauth_required'
  | 'captcha_required'
  | 'not_eligible'
  | 'upstream'
  | 'invalid_data'

/** A provider failure with a message that is safe to show the student. */
export class AcademicProviderError extends Error {
  constructor(public code: ProviderErrorCode, message: string) {
    super(message)
    this.name = 'AcademicProviderError'
  }
}
