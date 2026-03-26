'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

interface User { name: string; targetRole: string; readinessScore: number }
interface Gap { id: string; missingSkill: string; urgency: string; weeksToLearn: number; whyImportant: string; closed: boolean }
interface Sprint { id: string; dayTasks: DayTask[]; completionPercentage: number; skillsTargeted: string[] }
interface DayTask { day: number; focus: string; topic: string; time_minutes: number }
interface Skill { id: string; skillName: string; category: string; proficiency: string }

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [gaps, setGaps] = useState<Gap[]>([])
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadStep, setUploadStep] = useState(0)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setUploadError('') }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setUploadError('Please upload a PDF under 5MB')
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setUploadError(''); setUploadStep(1)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); setUploadStep(0); return }
      setUploadStep(2)
      await fetch('/api/gaps', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ targetRole: user?.targetRole ?? 'Industrial AI Engineer' }),
      })
      setUploadStep(3)
      window.location.reload()
    } catch { setUploadError('Upload failed. Please try again.'); setUploadStep(0) }
    finally { setUploading(false) }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then(r => r.json()),
      fetch('/api/gaps').then(r => r.json()),
      fetch('/api/sprints').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
    ]).then(([u, g, s, sk]) => {
      setUser(u.user)
      setGaps(g.gaps ?? [])
      setSprint(s.sprint)
      setSkills(sk.skills ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="p-8 text-gray-400">Loading Neural Architecture...</div>
  }

  const readiness = Math.round(user?.readinessScore ?? 0)
  const gapPercentage = 100 - readiness
  const firstName = user?.name?.split(' ')[0] || 'Architect'
  
  const proficiencyWidths: Record<string, number> = { beginner: 35, intermediate: 70, advanced: 95 }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-[#3B82F6]">{firstName}.</span>
          </h1>
          <p className="text-gray-400 mt-2 text-base">
            Your neural architecture is {readiness}% aligned with {user?.targetRole || 'Target Role'} benchmarks.<br/>
            Let's close the {gapPercentage}% gap today.
          </p>
        </div>
        <div className="bg-[#1C212B] text-gray-300 px-4 py-2 rounded-lg text-xs font-bold tracking-widest flex items-center gap-2 border border-[#2D3544]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          AI AGENT: ACTIVE
        </div>
      </div>

      {/* TOP GRID */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* NEURAL SKILL PROFILE */}
        <div className="col-span-12 lg:col-span-7 bg-[#141824] border border-[#1C212B] rounded-2xl p-8 relative overflow-hidden">
          <h2 className="text-xl font-bold mb-6">Neural Skill Profile</h2>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6 w-full">
              {skills.slice(0, 3).map((skill) => {
                const w = proficiencyWidths[skill.proficiency] || 50
                return (
                  <div key={skill.id}>
                    <div className="flex justify-between text-xs font-bold tracking-widest text-gray-400 mb-2 uppercase">
                      <span>{skill.skillName}</span>
                      <span>{w}%</span>
                    </div>
                    <div className="h-1 bg-[#1C212B] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" style={{ width: `${w}%` }}></div>
                    </div>
                  </div>
                )
              })}
              {skills.length === 0 && (
                <div className="mt-4 p-6 border border-dashed border-[#2D3544] rounded-xl bg-[#0A0D14]/50 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#1C212B] rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">Awaiting Curriculum Integration</h3>
                  <p className="text-gray-400 text-xs mb-4">Upload your PDF resume to initialize the neural profile mapping.</p>
                  
                  {uploadStep === 0 && (
                    <div className="w-full max-w-xs mx-auto">
                      <div {...getRootProps()} className={`w-full p-4 border rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-[#1C212B] hover:border-[#2D3544]'}`}>
                        <input {...getInputProps()} />
                        {file ? <span className="text-green-400 text-xs font-bold">{file.name}</span> : <span className="text-gray-500 text-xs font-bold tracking-wide uppercase">Drop PDF or browse files</span>}
                      </div>
                      {uploadError && <div className="text-red-400 text-[10px] mt-2 bg-red-500/10 p-1.5 rounded uppercase">{uploadError}</div>}
                      <button onClick={handleUpload} disabled={!file || uploading} className="mt-4 w-full bg-[#1C64F2] hover:bg-blue-600 focus:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs disabled:opacity-50 transition shadow-[0_0_15px_rgba(28,100,242,0.3)]">Inject Resume</button>
                    </div>
                  )}
                  {uploadStep > 0 && uploadStep < 3 && (
                     <div className="w-full text-center py-4">
                       <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                       <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{uploadStep === 1 ? 'Uploading Asset...' : 'Analyzing Architecture...'}</p>
                     </div>
                  )}
                  {uploadStep === 3 && (
                     <div className="text-green-400 text-xs font-bold py-4">Initialization Complete. Reloading...</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1C212B" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#B1C5FF" strokeWidth="8" 
                  strokeDasharray={`${readiness * 2.51} 251`} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-black">{readiness}%</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Match Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE SPRINT */}
        <div className="col-span-12 lg:col-span-5 bg-[#0F1626] border border-[#1C2A44] rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
          
          <div className="flex justify-between items-start mb-6">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="bg-[#1C2A44] text-blue-300 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
              {sprint ? `WEEK PROGRESS` : 'NO SPRINT'}
            </span>
          </div>

          <h2 className="text-xl font-bold mb-2">Sprint: {sprint?.skillsTargeted?.[0] || 'Architecture Optimizer'}</h2>
          <p className="text-sm text-blue-200/70 mb-8 min-h-[40px]">
             {sprint ? `Targeting inference and cognitive bottlenecks in ${sprint.skillsTargeted[0] || 'core'} architectures.` : 'No active learning sprint mapped to your profile.'}
          </p>

          <div className="space-y-3">
             {sprint?.dayTasks?.slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0A0D14]/80 p-3 rounded-xl border border-[#161B22]/50">
                  <div className="w-4 h-4 rounded-full border-2 border-green-500/50 flex items-center justify-center">
                     {i === 0 && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </div>
                  <span className="text-sm text-gray-300 truncate">{t.topic}</span>
                </div>
             ))}
             {!sprint && (
                <Link href="/sprint" className="block text-center bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition rounded-xl py-3 text-sm font-bold">
                  Initialize Sprint Configuration
                </Link>
             )}
          </div>
        </div>

      </div>

      {/* LOWER GRID */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* GAP ANALYSIS */}
        <div className="col-span-12 lg:col-span-4 bg-[#141824] border border-[#1C212B] rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-6">Gap Analysis</h2>
          <div className="space-y-4 flex-1">
            {gaps.filter(g => !g.closed).slice(0, 2).map((g, i) => (
              <div key={g.id} className="flex items-center gap-4 bg-[#0A0D14] p-4 rounded-xl border border-[#1C212B]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                   {i === 0 ? (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                   )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-200">{g.missingSkill}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{i === 0 ? `-${g.weeksToLearn * 5}% Industry Standard` : `Accelerating +12% this week`}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/market" className="text-xs font-bold tracking-widest text-[#B1C5FF] hover:text-white mt-6 uppercase flex items-center gap-2">
            View Full Breakdown &rarr;
          </Link>
        </div>

        {/* PROJECT 1 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-[#141824] border border-[#1C212B] rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#1a2f3a]/30"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <span className="bg-[#2a4358] text-[#8ab4f8] text-[9px] font-black tracking-widest px-2 py-1 rounded w-fit uppercase mb-4">High Potential</span>
            <h2 className="text-xl font-bold mb-2">Neuro-Traffic Optimizer</h2>
            <p className="text-sm text-gray-400 mb-6 flex-1">
              Design an AI that routes urban drone traffic using real-time atmospheric data.
            </p>
            <div className="flex gap-2">
              <span className="bg-[#1C212B] text-gray-400 text-xs px-2 py-1 rounded">Python</span>
              <span className="bg-[#1C212B] text-gray-400 text-xs px-2 py-1 rounded">Kubernetes</span>
            </div>
          </div>
        </div>

        {/* PROJECT 2 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-[#141824] border border-[#1C212B] rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#2a281e]/30"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <span className="bg-[#3e4554] text-[#b4c3e8] text-[9px] font-black tracking-widest px-2 py-1 rounded w-fit uppercase mb-4">Skill Multiplier</span>
            <h2 className="text-xl font-bold mb-2">Secure Ledger Graph</h2>
            <p className="text-sm text-gray-400 mb-6 flex-1">
              Integrating ZK-proofs into industrial supply chain data models.
            </p>
            <div className="flex gap-2">
              <span className="bg-[#1C212B] text-gray-400 text-xs px-2 py-1 rounded">Solidity</span>
              <span className="bg-[#1C212B] text-gray-400 text-xs px-2 py-1 rounded">Rust</span>
            </div>
          </div>
        </div>

      </div>

      {/* ARCHITECT INSIGHT BANNER */}
      <div className="bg-[#141824] border-l-4 border-cyan-400 border-t border-b border-r border-[#1C212B] rounded-r-2xl p-6 flex items-center justify-between gap-6 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-[#1C212B] border border-[#2D3544] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <h4 className="text-[10px] font-black tracking-widest text-cyan-400 uppercase mb-1">Architect Insight</h4>
            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
              Top-tier firms are prioritizing <strong className="text-white font-bold">Edge ML deployment</strong>. 
              Shifting your next Sprint to focus on CoreML could increase your hireability by 14%.
            </p>
          </div>
        </div>
        <Link href="/sprint" className="bg-[#B1C5FF] hover:bg-white text-[#0A0D14] transition font-bold px-6 py-2.5 rounded-lg text-sm flex-shrink-0">
          Accept Roadmap Pivot
        </Link>
      </div>

    </div>
  )
}
