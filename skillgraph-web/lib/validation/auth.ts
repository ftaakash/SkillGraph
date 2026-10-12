import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8

/** Bump when the Terms of Service or Privacy Policy materially change. */
export const TERMS_VERSION = '2026-10-14'

// Registration requires explicit acceptance (consent record for DPDP/GDPR)
const acceptTerms = z.literal(true, { message: 'You must accept the Terms of Service and Privacy Policy' })

// Emails are stored lower-case; login matches case-insensitively
export const emailSchema = z.string().trim().toLowerCase().email().max(254)

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
  acceptTerms,
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
  acceptTerms,
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
  acceptTerms,
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
