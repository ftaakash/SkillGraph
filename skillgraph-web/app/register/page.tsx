'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', college: '',
    branch: 'CSE', year: '3rd', targetRole: 'Industrial AI Engineer',
  })

  // We map the UI "Major" and "Grad Year" to the backend's "branch" and "year"
  const handleRegister = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      
      const { signIn } = await import('next-auth/react')
      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      
      router.push('/onboard') // Push to step 2
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex text-white relative overflow-hidden">
      
      {/* LEFT COLUMN: HERO MARKETING */}
      <div className="flex-1 hidden lg:flex flex-col justify-center px-16 lg:px-24">
        {/* Abstract background graphics */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <h3 className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase mb-6">The Future of Engineering</h3>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
          Build your <span className="text-[#3B82F6]">Industrial AI</span> career profile.
        </h1>
        <p className="text-gray-400 text-lg max-w-lg leading-relaxed mb-12">
          Join the elite ecosystem where engineering students transition into industrial architects. 
          Map your skills, bridge the gaps, and dominate the AI market.
        </p>

        <div className="space-y-6 max-w-lg">
          <div className="bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex gap-4 items-center">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-8m-4 8l-4-8" /></svg>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Skill Graph Integration</h4>
              <p className="text-xs text-gray-400">Automated mapping of your curriculum to industrial needs.</p>
            </div>
          </div>
          <div className="bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex gap-4 items-center">
            <div className="w-12 h-12 bg-cyan-400/10 text-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0 border border-cyan-400/20">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Sprint Learning</h4>
              <p className="text-xs text-gray-400">Fast-track your expertise with AI-curated engineering paths.</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-16 right-0 flex max-w-max items-center justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase">
          <span className="flex gap-16">
            <span>SkillGraph</span>
            <span>© 2024 SKILLGRAPH. ENGINEERING THE FUTURE.</span>
          </span>
          <span className="flex gap-8 ml-32">
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition">Documentation</span>
            <span className="hover:text-white cursor-pointer transition">Support</span>
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: REGISTRATION FLOW */}
      <div className="w-full lg:w-[600px] bg-[#141824] border-l border-[#1C212B] flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
        
        {/* Mobile Logo Only Show */}
        <div className="lg:hidden text-center mb-12">
          <span className="font-black text-2xl text-white">Skill<span className="text-blue-400">Graph</span></span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Create Architect Account</h2>
          <p className="text-gray-400 text-sm">Step 1 of 2: Basic Engineering Profile</p>
          <div className="mt-4 flex gap-2">
            <div className="flex-1 h-1 bg-blue-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-[#2D3544] rounded-full"></div>
          </div>
        </div>

        <button className="w-full bg-[#1C212B] hover:bg-[#2D3544] border border-[#2D3544] text-white py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-colors shadow-sm mb-8">
          <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-1.85 0-2.6 1-3.04 1.67v-1.43h-2.8v9h2.8v-4.96c0-.66.35-1.99 1.54-1.99 1.15 0 1.52.99 1.52 2.06v4.89h2.74zm-11.75-9.36c.86 0 1.55-.7 1.55-1.55s-.69-1.55-1.55-1.55-1.55.7-1.55 1.55.69 1.55 1.55 1.55zm1.44 9.36v-9h-2.8v9h2.8z" /></svg>
          Sync with LinkedIn Profile
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1C212B]"></div></div>
          <div className="relative flex justify-center text-[10px] font-black tracking-[0.2em]">
            <span className="bg-[#141824] px-4 text-gray-500 uppercase">Or Manually</span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">Full Name</label>
            <input type="text" placeholder="Johnathan Sterling" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">University</label>
            <input type="text" placeholder="MIT - School of Engineering" value={form.college} onChange={e => setForm({...form, college: e.target.value})}
              className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">Major</label>
              <input type="text" placeholder="Robotics AI" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})}
                className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">Grad Year</label>
              <input type="text" placeholder="2025" value={form.year} onChange={e => setForm({...form, year: e.target.value})}
                className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">Institutional Email</label>
            <input type="email" placeholder="j.sterling@university.edu" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 focus-within:text-blue-400 transition-colors">Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full bg-[#1C212B]/50 border border-[#2D3544] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
          </div>

          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}

          <button onClick={handleRegister} disabled={loading || !form.name || !form.email || !form.password}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-lg text-sm font-bold shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 transition-all flex justify-center items-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Continue to Intelligence Mapping
          </button>

          <div className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
            By registering, you agree to our <Link href="#" className="text-blue-400 hover:text-white transition-colors">Engineering Guidelines</Link> and <Link href="#" className="text-blue-400 hover:text-white transition-colors">Privacy Architecture</Link>.
          </div>
        </div>

      </div>
    </div>
  )
}
