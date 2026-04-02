import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'FACULTY') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
