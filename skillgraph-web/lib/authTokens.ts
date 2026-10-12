/**
 * Single-use tokens for email verification and password reset.
 * Only a SHA-256 hash is stored, so a database leak does not expose usable links.
 */
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

export type AuthTokenType = 'email_verify' | 'password_reset'

const TTL_MS: Record<AuthTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Issues a new token, invalidating any outstanding token of the same type for the user. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ])
  return token
}

/**
 * Atomically marks a valid token as used and returns its user id,
 * or null if the token is unknown, expired, already used, or of another type.
 */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  if (!token || token.length > 200) return null
  const tokenHash = hashToken(token)
  const claimed = await prisma.authToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (claimed.count !== 1) return null
  const row = await prisma.authToken.findUnique({ where: { tokenHash }, select: { userId: true } })
  return row?.userId ?? null
}
