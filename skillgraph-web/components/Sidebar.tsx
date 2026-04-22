'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function Sidebar({ user }: { user: { name: string, email: string } | null }) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'Sprints', path: '/sprint', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'Project Ideas', path: '/projects', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { name: 'Skill Market', path: '/market', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Linked AI', path: '/linkedin', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { name: 'Benchmarks', path: '/benchmark', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0A0D14] border-r border-[#1C212B] flex flex-col z-50">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6">
        <h1 className="text-[#3B82F6] font-black text-xl tracking-tight leading-none">
          Skill<span className="text-white">Graph</span>
        </h1>
      </div>

      {/* User Context */}
      <Link href="/profile" className="px-6 py-4 flex items-center gap-3 hover:bg-[#131924] transition-colors cursor-pointer group">
        <div className="w-10 h-10 rounded-full bg-[#1C212B] border border-[#2D3544] group-hover:border-blue-500/50 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors">
          <span className="text-gray-400 font-bold text-sm group-hover:text-blue-400 transition-colors">{user?.name?.charAt(0) ?? '?'}</span>
        </div>
        <div>
          <h2 className="text-white font-bold text-sm leading-tight group-hover:text-blue-100 transition-colors">Engineering Portal</h2>
          <p className="text-gray-500 text-xs mt-0.5 group-hover:text-blue-400/70 transition-colors">INDUSTRIAL AI READY</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`relative flex items-center gap-3 px-6 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-blue-500 bg-[#1A233A]'
                      : 'text-gray-500 hover:text-white hover:bg-[#131924]'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                  <svg className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#1C212B]">
        <button 
          onClick={() => signOut({ callbackUrl: window.location.origin })}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-white hover:bg-[#131924] transition-colors rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  )
}
