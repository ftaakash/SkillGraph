import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8

// Not lower-cased: login looks emails up verbatim and existing accounts may be mixed-case.
export const emailSchema = z.string().trim().email().max(254)

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password must be at most 128 characters')

const nameSchema = z.string().trim().min(2).max(100)
const optionalText = z.string().trim().max(200).optional()

export const studentRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['STUDENT']).optional().default('STUDENT'),
  college: optionalText,
  branch: optionalText,
  year: optionalText,
  targetRole: optionalText,
})

export const facultyRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  collegeName: z.string().trim().min(2).max(200),
  city: optionalText,
  state: optionalText,
  tier: optionalText,
  tpContactEmail: emailSchema.optional().or(z.literal('')),
})

export const recruiterRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().trim().min(2).max(200),
  companyWebsite: z.string().trim().max(300).optional(),
  tier: optionalText,
  hrEmail: emailSchema.optional().or(z.literal('')),
})

/** First human-readable validation message, suitable for showing in a form. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Invalid request'
  const field = issue.path.join('.')
  return field ? `${field}: ${issue.message}` : issue.message
}
