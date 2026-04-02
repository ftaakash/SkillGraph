import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { NextAuthConfig } from 'next-auth'

const config: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          companyId: user.companyId
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.collegeId = user.collegeId
        token.companyId = user.companyId
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
