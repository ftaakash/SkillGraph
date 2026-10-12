import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { NextAuthConfig } from 'next-auth'

// How long a signed-in instance trusts a cached sessionVersion before re-reading it
const SESSION_RECHECK_MS = 60_000
const versionCache = new Map<string, { version: number | null; checkedAt: number }>()

/** Current sessionVersion for a user, or null if the account no longer exists. */
async function currentSessionVersion(userId: string): Promise<number | null> {
  const cached = versionCache.get(userId)
  if (cached && Date.now() - cached.checkedAt < SESSION_RECHECK_MS) return cached.version
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } })
  const version = user?.sessionVersion ?? null
  versionCache.set(userId, { version, checkedAt: Date.now() })
  if (versionCache.size > 10_000) versionCache.clear()
  return version
}

/** Call after bumping sessionVersion so this instance stops trusting old sessions immediately. */
export function forgetSessionVersion(userId: string) {
  versionCache.delete(userId)
}

const config: NextAuthConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim()
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: {
            id: true, name: true, email: true, role: true, collegeId: true, companyId: true,
            passwordHash: true, sessionVersion: true,
          },
        })
        if (!user) {
          // Equalise timing with the not-found path so account existence can't be probed
          await bcrypt.compare(password, '$2b$12$NZ..H0iHTleF/0GCDy.3EuN2BB5hd3dKBf6KwHjZBqc9py4IzU16G')
          return null
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          companyId: user.companyId,
          sessionVersion: user.sessionVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.collegeId = user.collegeId
        token.companyId = user.companyId
        token.sv = user.sessionVersion ?? 0
        return token
      }

      // Existing session: end it if the password changed or the account was deleted
      if (typeof token.id === 'string') {
        try {
          const version = await currentSessionVersion(token.id)
          if (version === null || version !== (token.sv ?? 0)) return null
        } catch (err) {
          // Availability over strictness if the database is briefly unreachable
          console.warn('[auth] session version check skipped:', (err as Error).message)
        }
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'STUDENT' | 'FACULTY' | 'RECRUITER'
        session.user.collegeId = (token.collegeId as string) || null
        session.user.companyId = (token.companyId as string) || null
      }
      return session
    },
  },
  pages: { signIn: '/login', signOut: '/logout' },
  session: { strategy: 'jwt' },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
