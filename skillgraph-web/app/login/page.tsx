'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) { setError('Invalid email or password'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center relative overflow-hidden text-white selection:bg-blue-500/30">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      <div className="z-10 w-full max-w-[420px] flex flex-col items-center px-4">
        
        {/* BRANDING HEADER */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-500 rounded-xl mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">SkillGraph</h1>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Industrial Engineering Portal</p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#141824] border border-[#1C212B] rounded-2xl w-full p-8 shadow-2xl relative">
          <h2 className="text-xl font-bold mb-1">Welcome Back</h2>
          <p className="text-xs text-gray-400 mb-8">Please enter your details to access your dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 focus-within:text-blue-400 transition-colors">Work Email</label>
              <input type="email" placeholder="name@university.edu" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 focus-within:text-blue-400 transition-colors">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                <Link href="#" className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">Forgot Password?</Link>
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
            </div>

            {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}

            <div className="flex items-center gap-2 mt-4 mb-6">
              <input type="checkbox" id="remember" className="rounded bg-[#1C212B] border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-[#141824]" />
              <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none mb-[1px]">Remember this device for 30 days</label>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 transition-all flex justify-center items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Sign in to Portal
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1C212B]"></div></div>
            <div className="relative flex justify-center text-[10px] font-black tracking-widest">
              <span className="bg-[#141824] px-4 text-gray-500 bg-opacity-100 backdrop-blur-sm shadow-[0_0_10px_#141824] uppercase">Or Continue With</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-transparent hover:bg-white/5 border border-[#1C212B] py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
              Google
            </button>
            <button className="flex-1 bg-transparent hover:bg-white/5 border border-[#1C212B] py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors">
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-1.85 0-2.6 1-3.04 1.67v-1.43h-2.8v9h2.8v-4.96c0-.66.35-1.99 1.54-1.99 1.15 0 1.52.99 1.52 2.06v4.89h2.74zm-11.75-9.36c.86 0 1.55-.7 1.55-1.55s-.69-1.55-1.55-1.55-1.55.7-1.55 1.55.69 1.55 1.55 1.55zm1.44 9.36v-9h-2.8v9h2.8z" /></svg>
              LinkedIn
            </button>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400 border-t border-[#1C212B] pt-6">
            New to the Engineering Portal? <Link href="/register" className="text-white hover:text-blue-400 font-bold transition-colors">Get Started</Link>
          </div>
        </div>

        {/* BOTTOM INSIGHT PILL */}
        <div className="mt-12 bg-blue-500/5 border border-blue-500/20 text-blue-300 text-[10px] font-medium tracking-wide px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          AI Insights: 1,420 engineering roles optimized today.
        </div>

      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-[9px] font-black tracking-widest text-gray-600 uppercase">
        <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
        <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
        <span className="hover:text-gray-400 cursor-pointer">System Status</span>
      </div>
    </div>
  )
}
