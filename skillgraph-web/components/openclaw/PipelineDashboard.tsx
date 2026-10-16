'use client'

import { useEffect, useState, useCallback } from 'react'
import { Terminal, Plus, ChevronRight, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NegotiationModal from './NegotiationModal'
import { statusLabel, recommendationLabel, submittedViaLabel, parseTailoringNotes } from './labels'

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
  tailoringNotes?: string | null
  resumeVersionId?: string | null
  submittedVia?: string | null
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400 border border-green-500/40',
  B: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
  C: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  D: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  F: 'bg-red-500/20 text-red-400 border border-red-500/40',
}

const STATUS_COLORS: Record<string, string> = {
  Pending:        'text-yellow-400',
  ReadyToApply:   'text-emerald-400',
  Applied:        'text-cyan-400',
  Failed:         'text-red-500',
  UnableToApply:  'text-amber-400',
  Shortlisted:    'text-green-400',
  Interviewing:   'text-green-400',
  Offer:          'text-green-300',
  Viewed:         'text-blue-400',
  Rejected:       'text-red-400',
  Withdrawn:      'text-zinc-500',
  Closed:         'text-zinc-500',
  Duplicate:      'text-zinc-500',
}

// Statuses where the student still has to apply on the employer's site
const AWAITING_STUDENT = ['Pending', 'ReadyToApply']

export default function PipelineDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [pasted, setPasted] = useState({ company: '', role: '', jdText: '', sourceUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Application | null>(null)
  const [negListing, setNegListing] = useState<{ id: string; company: string; role: string } | null>(null)
  const [submitMsg, setSubmitMsg] = useState('')
  const [tailoring, setTailoring] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadApps = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/applications')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      setApplications(data.applications ?? [])
      setLoadError('')
    } catch (err) {
      setLoadError((err as Error).message || 'Could not load your pipeline. Retrying…')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApps()
    // Refresh while preparation runs, but not in background tabs
    const interval = setInterval(() => { if (!document.hidden) loadApps() }, 5000)
    return () => clearInterval(interval)
  }, [loadApps])

  const submit = async (body: Record<string, string>) => {
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res = await fetch('/api/openclaw/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.evaluation) {
        setSubmitMsg(`✓ ${data.existing ? 'Already in pipeline' : 'Evaluated'}: Grade ${data.evaluation.grade} (${Number(data.evaluation.totalScore).toFixed(0)}/100)`)
        setUrlInput('')
        setPasted({ company: '', role: '', jdText: '', sourceUrl: '' })
        loadApps()
      } else if (data.code === 'unsupported_source') {
        // LinkedIn, Naukri, … — switch to paste mode and keep the link for reference
        setPasted(p => ({ ...p, sourceUrl: urlInput.trim() }))
        setPasteMode(true)
        setSubmitMsg(`⚠ ${data.error}`)
      } else {
        setSubmitMsg(`✗ ${data.error ?? 'Evaluation failed.'}`)
      }
    } catch {
      setSubmitMsg('✗ Evaluation failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (pasteMode) {
      if (!pasted.company.trim() || !pasted.role.trim() || !pasted.jdText.trim()) {
        setSubmitMsg('⚠ Company, role and the job description are required.')
        return
      }
      submit(pasted)
    } else if (urlInput.trim()) {
      submit({ jobUrl: urlInput.trim() })
    }
  }

  const markApplied = async (appId: string) => {
    const res = await fetch(`/api/openclaw/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Applied' }),
    }).catch(() => null)
    if (!res?.ok) {
      setSubmitMsg('✗ Could not update the application. Try again.')
      return
    }
    loadApps()
    setSelected(null)
  }

  // A résumé tailored to a job the student evaluated themselves
  const tailor = async (appId: string) => {
    setTailoring(appId)
    setSubmitMsg('')
    try {
      const res = await fetch(`/api/openclaw/applications/${appId}/tailor`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      setSubmitMsg('✓ Résumé tailored to this job. Download it with the CV button.')
      setSelected(s => (s && s.id === appId ? { ...s, ...data.application } : s))
      loadApps()
    } catch (err) {
      setSubmitMsg(`✗ ${(err as Error).message || 'Could not tailor the résumé. Try again.'}`)
    } finally {
      setTailoring(null)
    }
  }

  const calculateGrade = (s: number) => {
    if (s >= 85) return 'A'
    if (s >= 70) return 'B'
    if (s >= 55) return 'C'
    if (s >= 40) return 'D'
    return 'F'
  }

  return (
    <div className="h-full flex flex-col gap-4" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      {/* Input: job link or pasted job description */}
      <div className="bg-[#0D1117] border border-cyan-500/20 rounded-xl p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <Terminal className="text-cyan-500 w-5 h-5 shrink-0" />
          {pasteMode ? (
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                value={pasted.company}
                onChange={e => setPasted({ ...pasted, company: e.target.value })}
                placeholder="Company"
                aria-label="Company"
                className="bg-transparent border-b border-zinc-800 outline-none text-cyan-300 text-sm placeholder:text-zinc-600"
              />
              <input
                value={pasted.role}
                onChange={e => setPasted({ ...pasted, role: e.target.value })}
                placeholder="Role"
                aria-label="Role"
                className="bg-transparent border-b border-zinc-800 outline-none text-cyan-300 text-sm placeholder:text-zinc-600"
              />
            </div>
          ) : (
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Paste a job link (Greenhouse, Lever, Ashby, company careers page) → Enter"
              aria-label="Job link"
              className="flex-1 bg-transparent outline-none text-cyan-300 text-sm placeholder:text-zinc-600"
            />
          )}
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setPasteMode(!pasteMode); setSubmitMsg('') }}
              className="border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 text-xs"
            >
              {pasteMode ? 'Use a link' : 'Paste JD'}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || (pasteMode ? !pasted.jdText.trim() : !urlInput.trim())}
              className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs gap-1"
            >
              <Plus size={12} /> {submitting ? 'Evaluating...' : 'Evaluate'}
            </Button>
          </div>
        </div>
        {pasteMode && (
          <>
            <textarea
              value={pasted.jdText}
              onChange={e => setPasted({ ...pasted, jdText: e.target.value })}
              placeholder="Paste the full job description here (required for LinkedIn, Naukri, Indeed and Glassdoor postings)"
              aria-label="Job description"
              className="w-full h-28 bg-[#010409] border border-zinc-800 rounded-lg p-3 text-xs text-cyan-200 outline-none focus:border-cyan-500/50 transition"
            />
            <input
              value={pasted.sourceUrl}
              onChange={e => setPasted({ ...pasted, sourceUrl: e.target.value })}
              placeholder="Posting link (optional — used for the “Open posting” button)"
              aria-label="Posting link"
              className="w-full bg-transparent border-b border-zinc-800 outline-none text-cyan-300 text-xs placeholder:text-zinc-600"
            />
          </>
        )}
        <p className="text-[10px] text-zinc-600">
          Smart Apply evaluates and prepares. You submit on the employer’s site (the browser extension can fill the form), unless you turned on auto-submit and the employer is connected to SkillGraph.
        </p>
      </div>
      {loadError && <p className="text-xs px-1 text-yellow-400" role="alert">{loadError}</p>}
      {submitMsg && <p className={`text-xs px-1 ${submitMsg.startsWith('✓') ? 'text-green-400' : 'text-yellow-400'}`}>{submitMsg}</p>}

      {/* Pipeline Table */}
      <div className="flex-1 bg-[#0A0D14] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[48px_1fr_1fr_52px_104px_196px] gap-3 px-4 py-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest">
          <span>Grade</span><span>Company</span><span>Role</span><span>Score</span><span>Status</span><span>Action</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-cyan-500 text-xs tracking-widest animate-pulse">Loading your pipeline…</div>
          ) : applications.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-xs tracking-widest">Nothing here yet. Add a job link or paste a job description above.</div>
          ) : (
            applications.map(app => {
              let parsedEvals = app.EvaluationResult
              const notes = parseTailoringNotes(app.tailoringNotes).evaluation
              if (!parsedEvals && notes) {
                parsedEvals = {
                  grade: notes.grade || '?',
                  totalScore: notes.matchScore || app.matchScore || 0,
                  recommendation: notes.recommendation || '',
                  keyStrengths: notes.keyStrengths || [],
                  keyWeaknesses: notes.keyWeaknesses || [],
                  negotiationLeverage: '',
                  dimensions: {}
                }
              }

              const score = parsedEvals?.totalScore ?? app.matchScore ?? 0
              const grade = parsedEvals?.grade && parsedEvals.grade !== '?' 
                ? parsedEvals.grade 
                : calculateGrade(score)
                
              const status = app.status
              // Backend could return either lowercase listing or uppercase Listing 
              const listing = (app as any).Listing ?? (app as any).listing
              
              return (
                <div
                  key={app.id}
                  className="grid grid-cols-[48px_1fr_1fr_52px_104px_196px] gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition items-center cursor-pointer"
                  onClick={() => setSelected({ ...app, EvaluationResult: parsedEvals, Listing: listing })}
                >
                  <span className={`text-xs font-black px-2 py-0.5 rounded text-center w-fit ${GRADE_COLORS[grade] ?? 'text-zinc-400'}`}>{grade}</span>
                  <span className="text-zinc-200 text-xs truncate">{listing?.company ?? '—'}</span>
                  <span className="text-zinc-400 text-xs truncate">{listing?.role ?? '—'}</span>
                  <span className="text-cyan-300 text-xs font-bold">{score.toFixed(0)}</span>
                  <span
                    title={status === 'UnableToApply' || status === 'Failed' ? 'Created by the retired auto-apply agent — apply on the posting yourself' : status}
                    className={`text-xs font-semibold cursor-help ${STATUS_COLORS[status] ?? 'text-zinc-400'}`}
                  >
                    {statusLabel(status)}
                    {status === 'Applied' && submittedViaLabel(app.submittedVia) && (
                      <span className="block text-[9px] font-normal text-zinc-500">{submittedViaLabel(app.submittedVia)}</span>
                    )}
                  </span>
                  <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                    {AWAITING_STUDENT.includes(status) && !app.resumeVersionId && (
                      <Button size="sm" variant="outline" onClick={() => tailor(app.id)} disabled={tailoring !== null} title="Build a résumé tailored to this job" className="border-primary/40 text-primary text-[10px] h-6 px-2">{tailoring === app.id ? '…' : 'Tailor CV'}</Button>
                    )}
                    {AWAITING_STUDENT.includes(status) && (
                      <Button size="sm" onClick={() => markApplied(app.id)} title="I've submitted this application" className="bg-green-700 hover:bg-green-600 text-white text-[10px] h-6 px-2 font-bold">I applied</Button>
                    )}
                    {listing && (
                      <Button size="sm" variant="ghost" aria-label="Negotiation scripts" onClick={() => setNegListing({ id: listing.id, company: listing.company, role: listing.role })} className="text-yellow-500 hover:text-yellow-400 h-6 px-1">
                        <BarChart2 size={12} />
                      </Button>
                    )}
                    {listing?.sourceUrl && (
                      <Button asChild size="sm" variant="ghost" className="text-zinc-500 hover:text-cyan-400 h-6 px-1">
                        <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Open posting" title="Open posting"><ChevronRight size={12} /></a>
                      </Button>
                    )}
                    {app.resumeVersionId && (
                      <Button asChild size="sm" variant="ghost" className="text-primary hover:text-cyan-300 h-6 px-2 text-[10px] border border-primary/20">
                        <a href={`/api/resume/download/${app.resumeVersionId}`} target="_blank" rel="noopener noreferrer" title="Download tailored résumé">📄 CV</a>
                      </Button>
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
                {(() => {
                  const s = selected.EvaluationResult?.totalScore ?? selected.matchScore ?? 0
                  const g = selected.EvaluationResult?.grade && selected.EvaluationResult.grade !== '?'
                    ? selected.EvaluationResult.grade
                    : calculateGrade(s)
                  return (
                    <div className={`inline-flex px-3 py-1 rounded font-black text-sm mb-2 ${GRADE_COLORS[g] ?? ''}`}>
                      {g} · {s.toFixed(0)}/100
                    </div>
                  )
                })()}
                <h2 className="text-white font-bold text-base">{selected.Listing?.company}</h2>
                <p className="text-zinc-400 text-xs">{selected.Listing?.role}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>

            {selected.EvaluationResult && (
              <>
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Recommendation</p>
                  <p className="text-cyan-400 text-sm font-semibold">{recommendationLabel(selected.EvaluationResult.recommendation)}</p>
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

              </>
            )}

            {(() => {
              const { advice, notSubmittedReason } = parseTailoringNotes(selected.tailoringNotes)
              return (
                <>
                  {advice && (
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">What to emphasise</p>
                      <p className="text-zinc-300 text-xs leading-relaxed">{advice}</p>
                    </div>
                  )}
                  {notSubmittedReason && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-amber-300 text-[10px] uppercase tracking-widest mb-1">Why it wasn’t submitted for you</p>
                      <p className="text-amber-100 text-xs leading-relaxed">{notSubmittedReason}</p>
                    </div>
                  )}
                </>
              )
            })()}

            {selected.status === 'Applied' && submittedViaLabel(selected.submittedVia) && (
              <p className="text-xs text-cyan-300">Applied · {submittedViaLabel(selected.submittedVia)}</p>
            )}

            {AWAITING_STUDENT.includes(selected.status) && (
              <div className="space-y-2 pt-2">
                {selected.resumeVersionId ? (
                  <Button asChild variant="outline" className="w-full border-primary/40 text-primary">
                    <a href={`/api/resume/download/${selected.resumeVersionId}`} target="_blank" rel="noopener noreferrer">Download tailored résumé</a>
                  </Button>
                ) : (
                  <Button onClick={() => tailor(selected.id)} disabled={tailoring !== null} variant="outline" className="w-full border-primary/40 text-primary">
                    {tailoring === selected.id ? 'Tailoring…' : 'Tailor my résumé to this job'}
                  </Button>
                )}
                {selected.Listing?.sourceUrl && (
                  <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold">
                    <a href={selected.Listing.sourceUrl} target="_blank" rel="noopener noreferrer">Open posting & apply ↗</a>
                  </Button>
                )}
                <Button onClick={() => markApplied(selected.id)} variant="outline" className="w-full border-green-700 text-green-400 hover:bg-green-900/30 font-bold">
                  ✓ I’ve submitted this application
                </Button>
              </div>
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
