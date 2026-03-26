'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DayTask { day: number; focus: string; topic: string; resource_type: string; resource_title: string; resource_url: string; time_minutes: number; mini_task: string; checkpoint: string }
interface Sprint { id: string; dayTasks: DayTask[]; completionPercentage: number; skillsTargeted: string[]; status: string }

export default function SprintPage() {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [checked, setChecked] = useState<boolean[]>(Array(7).fill(false))
  const [showConfetti, setShowConfetti] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch('/api/sprints').then(r => r.json()).then(d => {
      setSprint(d.sprint)
      if (d.sprint) {
        const completedDays = Math.round((d.sprint.completionPercentage / 100) * 7)
        setChecked(Array(7).fill(false).map(((_, i) => i < completedDays)))
      }
      setLoading(false)
    })
  }, [])

  const toggleDay = async (index: number) => {
    if (!sprint) return
    const newChecked = [...checked]
    newChecked[index] = !newChecked[index]
    setChecked(newChecked)
    const completedCount = newChecked.filter(Boolean).length
    const res = await fetch(`/api/sprints/${sprint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedCount }),
    })
    const data = await res.json()
    if (data.sprint) {
      setSprint(s => s ? { ...s, completionPercentage: data.sprint.completionPercentage, status: data.sprint.status } : s)
      if (data.sprint.status === 'completed') setShowConfetti(true)
    }
  }

  const pct = sprint?.completionPercentage ?? 0
  const days = (sprint?.dayTasks as DayTask[]) ?? []
  
  if (loading) return (
     <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-blue-500 font-bold tracking-widest text-[10px] uppercase animate-pulse">Initializing Sprint Configuration...</div>
     </div>
  )
  if (!sprint) return (
    <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[70vh]">
      <div className="text-center bg-[#141824] border border-[#1C212B] rounded-3xl p-12 max-w-md shadow-2xl">
        <div className="w-20 h-20 bg-[#1C212B] rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Active Sprint</h2>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">Your neural architecture lacks a scheduled sprint. Generate a dynamic 7-day technical mission based on your capability gaps.</p>
        <button onClick={async () => {
          setGenerating(true); setErrorMsg('')
          const r = await fetch('/api/sprints', { method: 'POST' }).then(r => r.json())
          if (r.error) {
             setErrorMsg(r.error)
          } else if (r.sprint) {
            setSprint(r.sprint)
            setChecked(Array(7).fill(false))
          }
          setGenerating(false)
        }} disabled={generating} className="bg-[#1C64F2] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(28,100,242,0.4)] hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center w-full gap-2 mt-4">
           {generating && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
           {generating ? 'Computing Vectors...' : 'Initialize Sprint Sequence'}
        </button>
        {errorMsg && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg uppercase tracking-wider">{errorMsg}</div>}
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      {showConfetti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0D14]/80 backdrop-blur-md">
          <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-12 text-center max-w-sm mx-4 shadow-2xl">
            <div className="text-6xl mb-6 transform hover:scale-110 transition cursor-default">🎉</div>
            <h2 className="text-2xl font-black mb-3 text-white">Sprint Complete!</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">Your readiness score just increased. Let's keep the momentum going!</p>
            <button onClick={() => setShowConfetti(false)} className="bg-[#B1C5FF] text-[#0A0D14] px-6 py-3 rounded-xl font-bold hover:bg-white transition text-sm">
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <span className="bg-[#1C212B] text-blue-400 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase mb-4 inline-block">7-Day Curated Sprint</span>
            <h1 className="text-4xl font-black text-white">{(sprint.skillsTargeted as string[]).join(' / ')}</h1>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{Math.round(pct)}%</div>
            <div className="text-[10px] font-bold tracking-widest text-[#B1C5FF] uppercase mt-2">Velocity Complete</div>
          </div>
        </div>

        {/* PROG BAR */}
        <div className="w-full bg-[#0A0D14] rounded-full h-3 mb-2 border border-[#1C212B] relative z-10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.6)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* DAY CARDS */}
      <div className="space-y-4">
        {days.map((day, i) => {
           const isDone = checked[i]
           return (
             <div key={day.day} className={`bg-[#141824] border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group 
                ${isDone ? 'border-green-500/30 opacity-60' : 'border-[#1C212B] hover:border-blue-500/50'}`}>
                
                {isDone && <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>}

                <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                  <button onClick={() => toggleDay(i)}
                    className={`mt-1 w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all shadow-sm
                    ${isDone ? 'bg-green-500 border-green-500 text-[#0A0D14]' : 'bg-[#0A0D14] border-[#2D3544] text-transparent hover:border-blue-500'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Day 0{day.day}</span>
                      <span className="h-1 w-1 bg-[#2D3544] rounded-full"></span>
                      <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{day.focus}</span>
                    </div>

                    <h3 className={`text-xl font-bold mb-4 transition-colors ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>{day.topic}</h3>

                    <div className="bg-[#0A0D14] border border-[#1C212B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <a href={day.resource_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 group/link">
                          <div className="w-8 h-8 bg-[#1C212B] rounded-lg flex items-center justify-center">
                             {day.resource_type === 'video' ? <svg className="w-4 h-4 text-gray-400 group-hover/link:text-blue-400 transition" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> : day.resource_type === 'article' ? <svg className="w-4 h-4 text-gray-400 group-hover/link:text-blue-400 transition" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> : <svg className="w-4 h-4 text-gray-400 group-hover/link:text-blue-400 transition" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">Resource material</div>
                            <div className={`text-sm font-bold transition ${isDone ? 'text-gray-500' : 'text-blue-400 hover:text-blue-300'}`}>{day.resource_title}</div>
                          </div>
                       </a>
                       <div className="text-right">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest bg-[#1C212B] px-2 py-1 rounded">~{day.time_minutes} min req.</span>
                       </div>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row gap-4">
                       <div className="flex-1">
                          <div className="flex gap-2 items-start">
                             <span className="text-blue-500 mt-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg></span>
                             <div>
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Execution Task</h4>
                                <p className={`text-sm leading-relaxed ${isDone ? 'text-gray-600' : 'text-gray-300'}`}>{day.mini_task}</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex-1">
                          <div className="flex gap-2 items-start">
                             <span className="text-green-500 mt-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></span>
                             <div>
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Completion Checkpoint</h4>
                                <p className={`text-sm leading-relaxed ${isDone ? 'text-gray-600' : 'text-gray-400'}`}>{day.checkpoint}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
             </div>
           )
        })}
      </div>
    </div>
  )
}
