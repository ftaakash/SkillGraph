import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return <>{children}</>
}
