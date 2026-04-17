'use client'

import { useEffect, useState, useCallback } from 'react'
import { Terminal, Plus, ChevronRight, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NegotiationModal from './NegotiationModal'

interface Application {
  id: string
  status: string
  matchScore: number | null
  appliedAt: string
  Listing?: {
    id: string
    company: string
    role: string
    location: string | null
    ctcBand: string | null
    sourceUrl: string
  }
  EvaluationResult?: {
    grade: string
    totalScore: number
    recommendation: string
    keyStrengths: string[]
    keyWeaknesses: string[]
    negotiationLeverage: string
    dimensions: Record<string, { score: number; maxScore: number; reasoning: string }>
  }
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400 border border-green-500/40',
  B: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
  C: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  D: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  F: 'bg-red-500/20 text-red-400 border border-red-500/40',
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'text-yellow-400',
  Applied: 'text-cyan-400',
  Rejected: 'text-red-400',
  Duplicate: 'text-zinc-500',
}

export default function PipelineDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Application | null>(null)
  const [negListing, setNegListing] = useState<{ id: string; company: string; role: string } | null>(null)
  const [submitMsg, setSubmitMsg] = useState('')

  const loadApps = useCallback(async () => {
    const res = await fetch('/api/openclaw/applications')
    const data = await res.json()
    setApplications(data.applications ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  const handlePasteUrl = async () => {
    if (!urlInput.trim()) return
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res = await fetch('/api/openclaw/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl: urlInput.trim() }),
      })
      const data = await res.json()
      if (data.evaluation) {
        setSubmitMsg(`✓ Evaluated: Grade ${data.evaluation.grade} (${data.evaluation.totalScore.toFixed(0)}/100)`)
      } else {
        setSubmitMsg('⚠ Pipeline returned no evaluation.')
      }
      setUrlInput('')
      loadApps()
    } catch {
      setSubmitMsg('✗ Pipeline failed. Check URL.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmApply = async (appId: string) => {
    await fetch(`/api/openclaw/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Applied' }),
    })
    loadApps()
    setSelected(null)
  }

  return (
    <div className="h-full flex flex-col gap-4" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      {/* URL Input Bar */}
      <div className="bg-[#0D1117] border border-cyan-500/20 rounded-xl p-4 flex gap-3 items-center">
        <Terminal className="text-cyan-500 w-5 h-5 shrink-0" />
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePasteUrl()}
          placeholder="Paste job URL to evaluate → press Enter"
          className="flex-1 bg-transparent outline-none text-cyan-300 text-sm placeholder:text-zinc-600"
        />
        <Button
          size="sm"
          onClick={handlePasteUrl}
          disabled={submitting || !urlInput.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs gap-1 shrink-0"
        >
          <Plus size={12} /> {submitting ? 'Evaluating...' : 'Evaluate'}
        </Button>
      </div>
      {submitMsg && <p className={`text-xs px-1 ${submitMsg.startsWith('✓') ? 'text-green-400' : 'text-yellow-400'}`}>{submitMsg}</p>}

      {/* Pipeline Table */}
      <div className="flex-1 bg-[#0A0D14] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_1fr_80px_100px_120px] gap-3 px-4 py-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest">
          <span>Grade</span><span>Company</span><span>Role</span><span>Score</span><span>Status</span><span>Action</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-cyan-500 text-xs tracking-widest animate-pulse">INITIALIZING PIPELINE...</div>
          ) : applications.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-xs tracking-widest">NO ENTRIES — PASTE A JOB URL TO BEGIN</div>
          ) : (
            applications.map(app => {
              const grade = app.EvaluationResult?.grade ?? '?'
              const score = app.EvaluationResult?.totalScore ?? app.matchScore ?? 0
              const status = app.status
              return (
                <div
                  key={app.id}
                  className="grid grid-cols-[60px_1fr_1fr_80px_100px_120px] gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition items-center cursor-pointer"
                  onClick={() => setSelected(app)}
                >
                  <span className={`text-xs font-black px-2 py-0.5 rounded text-center w-fit ${GRADE_COLORS[grade] ?? 'text-zinc-400'}`}>{grade}</span>
                  <span className="text-zinc-200 text-xs truncate">{app.Listing?.company ?? '—'}</span>
                  <span className="text-zinc-400 text-xs truncate">{app.Listing?.role ?? '—'}</span>
                  <span className="text-cyan-300 text-xs font-bold">{score.toFixed(0)}</span>
                  <span className={`text-xs font-semibold ${STATUS_COLORS[status] ?? 'text-zinc-400'}`}>{status}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {status === 'Pending' && (
                      <Button size="sm" onClick={() => handleConfirmApply(app.id)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] h-6 px-2 font-bold">Apply</Button>
                    )}
                    {app.Listing && (
                      <Button size="sm" variant="ghost" onClick={() => setNegListing({ id: app.Listing!.id, company: app.Listing!.company, role: app.Listing!.role })} className="text-yellow-500 hover:text-yellow-400 h-6 px-1">
                        <BarChart2 size={12} />
                      </Button>
                    )}
                    {app.Listing?.sourceUrl && (
                      <a href={app.Listing.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-cyan-400 h-6 px-1"><ChevronRight size={12} /></Button>
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Evaluation SlideOver */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#0D1117] border-l border-cyan-500/20 h-full overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <div className={`inline-flex px-3 py-1 rounded font-black text-sm mb-2 ${GRADE_COLORS[selected.EvaluationResult?.grade ?? '?'] ?? ''}`}>
                  {selected.EvaluationResult?.grade ?? '?'} · {selected.EvaluationResult?.totalScore?.toFixed(0) ?? '—'}/100
                </div>
                <h2 className="text-white font-bold text-base">{selected.Listing?.company}</h2>
                <p className="text-zinc-400 text-xs">{selected.Listing?.role}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>

            {selected.EvaluationResult && (
              <>
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Recommendation</p>
                  <p className="text-cyan-400 text-sm font-semibold">{selected.EvaluationResult.recommendation}</p>
                </div>

                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">10-Dimension Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(selected.EvaluationResult.dimensions).map(([dim, val]) => (
                      <div key={dim}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-zinc-400">{dim}</span>
                          <span className="text-cyan-300 font-bold">{val.score}/{val.maxScore}</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(val.score / val.maxScore) * 100}%` }} />
                        </div>
                        <p className="text-zinc-600 text-[10px] mt-0.5">{val.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {selected.EvaluationResult.keyStrengths.map((s, i) => <li key={i} className="text-green-400 text-xs flex gap-1.5"><span>✓</span>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Gaps</p>
                    <ul className="space-y-1">
                      {selected.EvaluationResult.keyWeaknesses.map((w, i) => <li key={i} className="text-red-400 text-xs flex gap-1.5"><span>✗</span>{w}</li>)}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Negotiation Leverage</p>
                  <p className="text-zinc-300 text-xs leading-relaxed">{selected.EvaluationResult.negotiationLeverage}</p>
                </div>

                {selected.status === 'Pending' && (
                  <Button onClick={() => handleConfirmApply(selected.id)} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold">
                    ✓ Confirm & Apply
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Negotiation Modal */}
      {negListing && (
        <NegotiationModal
          listingId={negListing.id}
          company={negListing.company}
          role={negListing.role}
          onClose={() => setNegListing(null)}
        />
      )}
    </div>
  )
}
