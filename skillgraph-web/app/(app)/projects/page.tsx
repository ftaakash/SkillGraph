'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Project {
  title: string
  tagline: string
  difficulty: string
  tech_stack: string[]
  core_features: string[]
  github_readme_outline: string[]
  recruiter_signal: string
  time_to_build_weeks: number
}

// User context needed for the TARGET / RANK badges
interface UserProfile { name: string; targetRole: string; readinessScore: number }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const fetchProjects = async () => {
    setGenerating(true)
    setError('')
    try {
      const uRes = await fetch('/api/users/me').then(r => r.json())
      setUser(uRes.user)

      const res = await fetch('/api/ai/projects', { method: 'POST' })
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
      else if (data.error) setError(data.error)
    } catch (err) {
      setError('Failed to generate architectural prompts.')
    }
    setGenerating(false)
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const readiness = user?.readinessScore ?? 0
  const rank = readiness > 80 ? 'L5 Architect' : readiness > 50 ? 'L3 Senior Student' : 'L1 Apprentice'

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Architectural <span className="italic text-[#B1C5FF]">Prompts</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Precision-engineered project ideas curated by our neural network to match 
            your industrial readiness profile. Choose a blueprint and start building.
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="bg-[#1C212B] text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 border border-[#2D3544]">
            <span className="text-gray-500 uppercase">TARGET:</span> {user?.targetRole || 'Industrial AI Engineer'}
          </div>
          <div className="bg-[#1C212B] text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 border border-[#2D3544]">
            <span className="text-[#F87171] uppercase">RANK:</span> {rank}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex justify-between items-center border-b border-[#1C212B] pb-4">
        <div className="flex gap-2">
          <button className="bg-[#B1C5FF] text-[#0A0D14] px-4 py-1.5 rounded-full text-xs font-bold transition">All Disciplines</button>
          <button className="bg-[#141824] text-gray-400 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition">Computer Vision</button>
          <button className="bg-[#141824] text-gray-400 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition">NLP Architectures</button>
          <button className="bg-[#141824] text-gray-400 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition">Reinforcement Learning</button>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] tracking-widest font-bold text-gray-500 uppercase">Difficulty:</span>
           <button className="bg-[#141824] border border-[#1C212B] text-gray-300 px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2">
             Industrial-Grade <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <button onClick={fetchProjects} disabled={generating} className="ml-4 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded text-xs font-bold transition">
             {generating ? 'Regenerating...' : '↺ Refresh'}
           </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500">
           <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           Gathering intelligence from the network...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
          {error}
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-6">
          
          {/* TOP 2 HIGHLIGHT CARDS */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LARGE FEATURE CARD (Item 0) */}
            <div className="flex-[2] bg-[#141824] border border-[#1C212B] rounded-2xl overflow-hidden relative flex flex-col group min-h-[400px]">
              {/* Fake aesthetic background map/dots */}
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0F293E] to-transparent opacity-40"></div>
              
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="flex justify-between items-start mb-auto">
                  <span className="bg-cyan-400 text-[#0A0D14] text-[10px] font-black tracking-widest px-2.5 py-1 rounded w-fit uppercase">High Impact Potential</span>
                  <span className="bg-white/10 text-white/50 border border-white/10 text-[9px] font-mono px-2 py-0.5 rounded">PROMPT-ID: NX-{(Math.random()*9000+1000).toFixed(0)}</span>
                </div>
                
                <h2 className="text-4xl font-bold text-white mt-12 mb-4 drop-shadow-lg">{projects[0].title}</h2>
                <p className="text-gray-300 text-sm max-w-lg leading-relaxed mb-6">
                  {projects[0].tagline}<br/>
                  <br/>
                  Recruiter Signal: {projects[0].recruiter_signal}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {(projects[0].tech_stack || []).slice(0, 4).map(tech => (
                    <span key={tech} className="bg-white/5 border border-white/10 text-gray-300 text-[10px] px-2.5 py-1 rounded-md font-bold">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-end mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C212B] flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8v8H8V8h8m0-2H8c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" /></svg>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 font-black tracking-widest uppercase">Career Boost</div>
                      <div className="text-sm font-bold text-white">+{(projects[0].time_to_build_weeks * 40)} Architecture Score</div>
                    </div>
                  </div>
                  <button className="text-white hover:text-cyan-400 transition font-bold text-sm tracking-wide flex items-center gap-2">
                    Initialize Blueprint &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* MEDIUM ACCENT CARD (Item 1) */}
            {projects[1] && (
              <div className="flex-1 bg-gradient-to-b from-[#1C1615] to-[#141111] border border-red-900/40 rounded-2xl relative flex flex-col min-h-[400px] border-b-4 border-b-red-600 overflow-hidden">
                <div className="p-8 flex flex-col h-full relative z-10">
                  <span className="text-red-400 text-[10px] font-black tracking-widest uppercase mb-4">Core AI Architecture</span>
                  <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{projects[1].title}</h2>
                  <p className="text-gray-400 text-xs leading-relaxed mb-8 flex-1">
                    {projects[1].tagline}
                  </p>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-gray-500 font-bold">Difficulty</span>
                      <span className={`font-bold ${projects[1].difficulty === 'intermediate' ? 'text-yellow-500' : 'text-red-500'}`}>{projects[1].difficulty.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-gray-500 font-bold">Primary Scope</span>
                      <span className="text-gray-300 font-bold truncate max-w-[120px]">{(projects[1].tech_stack || [])[0]}</span>
                    </div>
                  </div>

                  <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 transition text-gray-300 py-3 rounded-lg text-xs font-bold mt-auto tracking-widest uppercase">
                    View Technical Spec
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* LOWER 3 CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.slice(2).map((proj, i) => (
              <div key={i} className="bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex flex-col hover:border-gray-600 transition group">
                <h3 className="text-lg font-bold text-white mb-3">{proj.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-6 flex-1">
                  {proj.tagline}
                </p>
                
                <div className="flex justify-between items-center mt-auto text-[9px] font-black tracking-widest text-gray-500 uppercase">
                  <span>Impact: {proj.difficulty === 'beginner' ? 'Med' : 'High'}</span>
                  <span className="truncate max-w-[150px] text-right">Stack: {(proj.tech_stack || []).slice(0, 2).join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      ) : null}

      {/* ARCHITECT INSIGHT PROMPT AT BOTTOM */}
      {!loading && !error && projects.length > 0 && (
        <div className="mt-8 bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-[#B1C5FF]/10 flex items-center justify-center flex-shrink-0">
                 <svg className="w-6 h-6 text-[#B1C5FF]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.5-6.3-4.7-6.3 4.7 2.3-7.5-6-4.6h7.6L12 2z" /></svg>
              </div>
              <div>
                 <h4 className="text-[10px] font-black tracking-widest text-[#B1C5FF] uppercase mb-1">Architect Insight</h4>
                 <h3 className="text-lg font-bold text-white mb-1">Recommended for your Next Sprint</h3>
                 <p className="text-sm text-gray-400">
                    Based on your recent Neural Architecture readiness, we suggest the 
                    <span className="text-white font-bold ml-1">{projects[0]?.title}</span>.
                 </p>
              </div>
           </div>
           <Link href="/sprint" className="bg-[#1C64F2] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-lg text-sm transition text-center w-full md:w-auto flex-shrink-0">
             Claim Project Idea
           </Link>
        </div>
      )}

    </div>
  )
}
