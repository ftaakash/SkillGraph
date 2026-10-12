import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, badRequest, serverError } from '@/lib/api'
import { consumeAuthToken } from '@/lib/authTokens'

const bodySchema = z.object({ token: z.string().min(10).max(200) })

// POST /api/auth/verify-email — confirm an email address with the emailed token.
// The link opens a page that POSTs here, so email link scanners can't consume the token.
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Invalid verification link')

    const userId = await consumeAuthToken(parsed.data.token, 'email_verify')
    if (!userId) return badRequest('This verification link is invalid or has expired. Request a new one from your profile.')

    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } })
    return ok({ verified: true })
  } catch (err) {
    console.error('[auth/verify-email]', err)
    return serverError()
  }
}
