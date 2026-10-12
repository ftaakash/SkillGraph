import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { ok, badRequest, serverError } from '@/lib/api'
import { consumeAuthToken } from '@/lib/authTokens'
import { invalidateSessions } from '@/lib/accounts'
import { passwordSchema, firstIssue } from '@/lib/validation/auth'

const bodySchema = z.object({ token: z.string().min(10).max(200), password: passwordSchema })

// POST /api/auth/password/reset — set a new password with an emailed token; signs out every session
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstIssue(parsed.error))

    const userId = await consumeAuthToken(parsed.data.token, 'password_reset')
    if (!userId) return badRequest('This reset link is invalid or has expired. Request a new one.')

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    // Receiving the email proves ownership of the address
    await prisma.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } })
    await invalidateSessions(userId)
    return ok({ reset: true })
  } catch (err) {
    console.error('[auth/password/reset]', err)
    return serverError()
  }
}
