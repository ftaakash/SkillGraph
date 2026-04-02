import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'STUDENT' | 'FACULTY' | 'RECRUITER'
      collegeId?: string | null
      companyId?: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: 'STUDENT' | 'FACULTY' | 'RECRUITER'
    collegeId?: string | null
    companyId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'STUDENT' | 'FACULTY' | 'RECRUITER'
    collegeId?: string | null
    companyId?: string | null
  }
}
