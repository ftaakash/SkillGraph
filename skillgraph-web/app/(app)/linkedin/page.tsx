'use client'
import { useState } from 'react'

interface OptimizedProfile { headline: string; about: string; skills: string[]; keywords_added: string[]; ats_score_estimate_before: number; ats_score_estimate_after: number; improvement_tips: string[] }

export default function LinkedInPage() {
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [skillsList, setSkillsList] = useState('')
  const [result, setResult] = useState<OptimizedProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOptimize = async () => {
    if (!headline || !about || !skillsList) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/ai/linkedin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, about, skillsList }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Optimization failed'); return }
      setResult(data.result)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-4 relative z-10">
        <div className="max-w-xl">
          <span className="bg-[#1C212B] text-blue-400 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase mb-4 inline-block shadow-sm">AI Copilot</span>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            LinkedIn Profile <span className="text-blue-500">Optimizer</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Neural architecture specifically trained to rewrite your professional profile 
            to bypass Applicant Tracking Systems (ATS) and maximize recruiter visibility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* INPUT FORM SECTION */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 shadow-xl">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#B1C5FF] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Source Architecture
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block focus-within:text-blue-400 transition-colors">Headline (Current)</label>
                <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. B.Tech CSE Student | MERN Stack Developer"
                  className="w-full bg-[#0A0D14] border border-[#2D3544] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block focus-within:text-blue-400 transition-colors">About / Summary</label>
                <textarea value={about} onChange={e => setAbout(e.target.value)} rows={6} placeholder="Paste your LinkedIn About section..."
                  className="w-full bg-[#0A0D14] border border-[#2D3544] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all resize-none" />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block focus-within:text-blue-400 transition-colors">System Skills (Comma Separated)</label>
                <input value={skillsList} onChange={e => setSkillsList(e.target.value)} placeholder="React, Node.js, Python, SQL..."
                  className="w-full bg-[#0A0D14] border border-[#2D3544] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:bg-[#1C212B] focus:outline-none transition-all" />
              </div>

              {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
              
              <button onClick={handleOptimize} disabled={loading || !headline || !about || !skillsList}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                {loading ? 'Initializing Engine...' : 'Initialize AI Rewrite'}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT SECTION */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 relative overflow-hidden h-full shadow-xl">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-green-400 mb-6 flex items-center gap-2 relative z-10">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Optimized output
            </h3>

            {!result ? (
              <div className="border border-dashed border-[#2D3544] rounded-2xl bg-[#0A0D14]/50 flex flex-col items-center justify-center p-16 h-[500px]">
                <div className="w-16 h-16 bg-[#1C212B] rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <svg className="w-8 h-8 text-blue-500 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <p className="text-gray-400 text-sm font-medium tracking-wide">Awaiting system input to begin optimization protocol.</p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Score Diff Component */}
                <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
                  <div className="flex gap-8 items-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Before</div>
                      <div className="text-3xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]">{result.ats_score_estimate_before}</div>
                    </div>
                    <div className="text-[#2D3544]">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-green-500/50 font-bold uppercase tracking-widest mb-1">After</div>
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">{result.ats_score_estimate_after}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#B1C5FF] font-black text-[10px] uppercase tracking-widest">ATS Visibility Score</span>
                  </div>
                </div>

                <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-6 relative group">
                  <div className="absolute top-4 right-4 text-[#2D3544] group-hover:text-blue-400 transition cursor-pointer" onClick={() => navigator.clipboard.writeText(result.headline)}>
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Optimized Headline</div>
                  <p className="font-bold text-[#B1C5FF] text-lg leading-snug">{result.headline}</p>
                </div>

                <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-6 relative group">
                  <div className="absolute top-4 right-4 text-[#2D3544] group-hover:text-blue-400 transition cursor-pointer" onClick={() => navigator.clipboard.writeText(result.about)}>
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-3">Optimized Action Summary</div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{result.about}</p>
                </div>

                <div className="bg-[#0A0D14] border border-[#1C212B] rounded-2xl p-6">
                  <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-4">Neural Keywords Injected</div>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords_added.map(k => (
                       <span key={k} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">{k}</span>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
