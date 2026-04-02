import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'RECRUITER') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
