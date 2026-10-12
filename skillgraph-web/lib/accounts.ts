/**
 * Account lifecycle helpers shared by registration, verification, password reset
 * and account deletion (ADR-001 Phase 3).
 */
import { prisma } from '@/lib/prisma'
import { forgetSessionVersion } from '@/auth'
import { issueAuthToken } from '@/lib/authTokens'
import { sendVerificationEmail } from '@/lib/email'
import { logger } from '@/lib/log'
import { TERMS_VERSION } from '@/lib/validation/auth'

export async function emailInUse(email: string) {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true },
  })
  return Boolean(existing)
}

/** Consent record stored with every new account. */
export function consentFields() {
  return { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION }
}

/** Sends (or re-sends) the verification email. Never throws — registration must not fail on email. */
export async function sendVerification(user: { id: string; email: string; name: string }) {
  try {
    const token = await issueAuthToken(user.id, 'email_verify')
    await sendVerificationEmail(user.email, user.name, token)
    return true
  } catch (err) {
    logger.error('auth.verification_email_failed', { userId: user.id, err })
    return false
  }
}

/** Ends every existing session for the user (password change, reset, deletion). */
export async function invalidateSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
  forgetSessionVersion(userId)
}
