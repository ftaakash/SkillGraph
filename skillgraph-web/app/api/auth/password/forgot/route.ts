import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, badRequest } from '@/lib/api'
import { issueAuthToken } from '@/lib/authTokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { logger } from '@/lib/log'
import { emailSchema } from '@/lib/validation/auth'

const bodySchema = z.object({ email: emailSchema })
const GENERIC = { message: 'If an account exists for that email, a reset link is on its way.' }

// POST /api/auth/password/forgot — always answers the same way so it can't be used to discover accounts
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return badRequest('Enter a valid email address')

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
    })
    if (user) {
      const token = await issueAuthToken(user.id, 'password_reset')
      await sendPasswordResetEmail(user.email, user.name, token)
    }
  } catch (err) {
    logger.error('auth.password_forgot_failed', { err })
  }
  return ok(GENERIC)
}
