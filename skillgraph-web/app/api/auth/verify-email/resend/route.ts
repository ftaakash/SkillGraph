import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError } from '@/lib/api'
import { getUserId } from '@/lib/api'
import { sendVerification } from '@/lib/accounts'

// POST /api/auth/verify-email/resend — send a fresh verification link to the signed-in user
export async function POST() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    })
    if (!user) return unauthorized()
    if (user.emailVerifiedAt) return ok({ alreadyVerified: true })

    const sent = await sendVerification(user)
    return ok({ sent })
  } catch (err) {
    console.error('[auth/verify-email/resend]', err)
    return serverError()
  }
}
