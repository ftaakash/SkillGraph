import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { issueAuthToken, revokeAuthTokens } from '@/lib/authTokens'
import { TOKEN_PREFIX } from '@/lib/extension'

async function student() {
  const user = (await auth())?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'STUDENT' ? user.id : null
}

// GET /api/extension/connect — whether a browser extension is connected
export async function GET() {
  try {
    const userId = await student()
    if (!userId) return unauthorized()
    const token = await prisma.authToken.findFirst({
      where: { userId, type: 'extension', usedAt: null, expiresAt: { gt: new Date() } },
      select: { createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ connected: Boolean(token), connectedAt: token?.createdAt ?? null, expiresAt: token?.expiresAt ?? null })
  } catch (err) {
    console.error('[extension/connect GET]', err)
    return serverError()
  }
}

// POST /api/extension/connect — a new extension access token (shown once; replaces any earlier one)
export async function POST() {
  try {
    const userId = await student()
    if (!userId) return unauthorized()
    const token = await issueAuthToken(userId, 'extension')
    return ok({ token: `${TOKEN_PREFIX}${token}`, expiresInDays: 30 })
  } catch (err) {
    console.error('[extension/connect POST]', err)
    return serverError()
  }
}

// DELETE /api/extension/connect — disconnect the extension (the token stops working immediately)
export async function DELETE() {
  try {
    const userId = await student()
    if (!userId) return unauthorized()
    await revokeAuthTokens(userId, 'extension')
    return ok({ connected: false })
  } catch (err) {
    console.error('[extension/connect DELETE]', err)
    return serverError()
  }
}
