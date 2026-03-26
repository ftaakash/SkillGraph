'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BucketItem { range: string; count: number }
interface BenchmarkData { buckets: BucketItem[]; median: number; top10Threshold: number; totalStudents: number }

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [userScore, setUserScore] = useState<number | null>(null)
  const [role, setRole] = useState('Industrial AI Engineer')
  const roles = ['Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev']

  useEffect(() => {
    fetch(`/api/benchmarks?role=${role}`).then(r => r.json()).then(setData)
    fetch('/api/users/me').then(r => r.json()).then(d => setUserScore(d.user?.readinessScore ?? null))
  }, [role])

  const maxCount = data ? Math.max(...data.buckets.map(b => b.count), 1) : 1
  const userBucket = userScore !== null ? Math.min(Math.floor(userScore / 10) * 10, 90) : null

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-4 relative z-10">
        <div className="max-w-xl">
          <span className="bg-[#1C212B] text-cyan-400 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase mb-4 inline-block shadow-sm">Global Data Stream</span>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Career <span className="text-cyan-400">Benchmarks</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Compare your trajectory with top engineering peers across the global industrial sector. 
            Real-time analytics derived from live market metadata.
          </p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 flex-wrap mb-8">
        {roles.map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${role === r ? 'bg-[#1C64F2] border-[#1C64F2] text-white' : 'bg-[#141824] border-[#1C212B] text-gray-400 hover:text-white hover:border-[#2D3544]'}`}>
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* CHART SECTION */}
        <div className="col-span-12 lg:col-span-8 bg-[#141824] border border-[#1C212B] rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <h3 className="font-bold text-white mb-8">Readiness Score Distribution</h3>

          {data && data.totalStudents === 0 ? (
            <div className="text-center py-24 border border-dashed border-[#2D3544] rounded-2xl bg-[#0A0D14]/50">
              <div className="w-12 h-12 bg-[#1C212B] rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <p className="text-gray-400 text-sm font-medium tracking-wide">No benchmark data mapped for this sector yet.</p>
              <p className="text-[#2D3544] text-[10px] font-black uppercase mt-2 tracking-widest">Awaiting Initial Architecture</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-64 mt-10 relative z-10 px-4">
              {data?.buckets.map(({ range, count }) => {
                const isUser = userBucket !== null && parseInt(range) === userBucket
                const heightPct = Math.max((count / maxCount) * 100, count > 0 ? 5 : 0)

                return (
                  <div key={range} className="flex flex-col items-center flex-1 gap-3 relative group">
                    <div className="relative w-full flex justify-center h-full items-end">
                      {isUser && (
                        <div className="absolute -top-12 bg-cyan-500 text-[#0A0D14] px-2 py-1 rounded shadow-[0_0_10px_rgba(34,211,238,0.5)] text-[9px] font-black tracking-widest uppercase z-20 tooltip-arrow pointer-events-none">YOU</div>
                      )}
                      
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C212B] border border-[#2D3544] text-gray-300 text-[10px] px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap font-bold">
                        Count: {count}
                      </div>

                      <div className={`w-full rounded-t-md transition-all duration-1000 ${isUser ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-gradient-to-t from-[#1C212B] to-[#2D3544] group-hover:to-gray-500'}`}
                        style={{ height: `${heightPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{range}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* METRICS STACK */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {data ? (
            <>
              {/* Metric Card 1 */}
              <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 flex-1 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full pointer-events-none group-hover:bg-cyan-400/10 transition-colors"></div>
                <div className="text-[10px] text-gray-500 font-black tracking-widest mb-2 uppercase">Your Trajectory Score</div>
                <div className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  {userScore !== null ? `${Math.round(userScore)}%` : 'N/A'}
                </div>
              </div>

              {/* Metric Card 2 */}
              <div className="bg-[#141824] border border-[#1C212B] rounded-3xl p-8 flex-1 flex flex-col justify-center">
                <div className="text-[10px] text-gray-500 font-black tracking-widest mb-2 uppercase">Global Median</div>
                <div className="text-4xl font-bold text-white">
                  {data.median}%
                </div>
              </div>

              {/* Metric Card 3 */}
              <div className="bg-gradient-to-br from-[#1C212B] to-[#141824] border border-[#2D3544] rounded-3xl p-8 flex-1 flex flex-col justify-center relative overflow-hidden">
                <div className="text-[10px] text-[#B1C5FF] font-black tracking-widest mb-2 uppercase">Top 10% Elite Bracket</div>
                <div className="text-4xl font-bold text-[#B1C5FF]">
                  {data.top10Threshold}% <span className="text-lg opacity-50">+</span>
                </div>
              </div>
            </>
          ) : (
             <div className="flex-1 bg-[#141824] border border-[#1C212B] rounded-3xl p-8 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          )}
        </div>

      </div>
    </div>
  )
}
