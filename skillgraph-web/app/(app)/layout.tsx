import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#0A0D14] text-white font-sans antialiased selection:bg-blue-500/30">
      <Sidebar user={session.user} />
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
