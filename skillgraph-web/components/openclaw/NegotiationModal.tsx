'use client'

import { useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Script {
  title?: string
  openingLine: string
  mainArgument: string
  dataPoints?: string[]
  closingLine: string
}

interface NegotiationScripts {
  script1: Script
  script2: Script
  script3: Script
}

interface Props {
  listingId: string
  company: string
  role: string
  onClose: () => void
}

const LABELS = ['Geographic Pushback', 'Competing Offer', 'Skill Premium']

export default function NegotiationModal({ listingId, company, role, onClose }: Props) {
  const [scripts, setScripts] = useState<NegotiationScripts | null>(null)
  const [loading, setLoading] = useState(false)
  const [offeredCtc, setOfferedCtc] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/openclaw/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, offeredCtcLpa: parseFloat(offeredCtc) || 10 }),
      })
      const data = await res.json()
      setScripts(data.scripts ? { script1: data.scripts.script1, script2: data.scripts.script2, script3: data.scripts.script3 } : null)
    } finally {
      setLoading(false)
    }
  }

  const activeScript = scripts ? [scripts.script1, scripts.script2, scripts.script3][activeTab] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D1117] border border-cyan-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-cyan-400 w-5 h-5" />
            <div>
              <h2 className="text-white font-bold text-base tracking-tight">Negotiation Scripts</h2>
              <p className="text-zinc-500 text-xs">{role} · {company}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* CTC Input */}
          {!scripts && (
            <div className="space-y-3">
              <label className="text-xs text-zinc-400 uppercase tracking-widest">Offered CTC (₹ LPA)</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={offeredCtc}
                  onChange={e => setOfferedCtc(e.target.value)}
                  placeholder="e.g. 12"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 outline-none"
                />
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6"
                >
                  {loading ? 'Generating...' : 'Generate Scripts'}
                </Button>
              </div>
            </div>
          )}

          {/* Script Tabs */}
          {scripts && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setActiveTab(i)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition border ${activeTab === i ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeScript && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest">{LABELS[activeTab]}</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Opening</p>
                      <p className="text-zinc-200 leading-relaxed">{activeScript.openingLine}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Argument</p>
                      <p className="text-zinc-200 leading-relaxed">{activeScript.mainArgument}</p>
                    </div>
                    {activeScript.dataPoints && activeScript.dataPoints.length > 0 && (
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Data Points</p>
                        <ul className="space-y-1">
                          {activeScript.dataPoints.map((dp, i) => (
                            <li key={i} className="text-zinc-300 text-xs flex gap-2"><span className="text-cyan-500">›</span>{dp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Closing</p>
                      <p className="text-zinc-200 leading-relaxed">{activeScript.closingLine}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={() => setScripts(null)} className="w-full border-zinc-700 text-zinc-400 hover:text-white text-xs">
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
