'use client'

import { useEffect, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Story {
  id: string
  theme: string
  company?: string | null
  role?: string | null
  starSituation: string
  starTask: string
  starAction: string
  starResult: string
  starReflection: string
}

const THEME_COLORS: Record<string, string> = {
  Leadership: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  Tech: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
  Conflict: 'text-red-400 border-red-500/30 bg-red-500/5',
  Collaboration: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  Failure: 'text-orange-400 border-orange-500/30 bg-orange-500/5',
  Growth: 'text-green-400 border-green-500/30 bg-green-500/5',
}

export default function StoryBankPanel() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/openclaw/stories')
    const data = await res.json()
    setStories(data.stories ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    await fetch('/api/openclaw/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    await load()
    setGenerating(false)
  }

  return (
    <div className="bg-[#0D1117] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BookOpen className="text-cyan-400 w-4 h-4" />
          <span className="text-white text-sm font-semibold tracking-tight">Story Bank</span>
          <span className="text-zinc-600 text-xs">· {stories.length} stories</span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={generating} className="text-zinc-400 hover:text-cyan-400 text-xs gap-1">
          <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Extracting...' : 'Generate New'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-xs animate-pulse">Loading stories...</div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-zinc-500 text-xs text-center">No stories yet.<br />Click Generate to extract from your profile.</p>
          </div>
        ) : (
          stories.map(story => (
            <div
              key={story.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${THEME_COLORS[story.theme] ?? 'text-zinc-400 border-zinc-700'}`}
              onClick={() => setExpanded(expanded === story.id ? null : story.id)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{story.theme}</span>
                {story.company && <span className="text-zinc-500 text-[10px]">{story.company}</span>}
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">{story.starSituation}</p>

              {expanded === story.id && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {[
                    ['Situation', story.starSituation],
                    ['Task', story.starTask],
                    ['Action', story.starAction],
                    ['Result', story.starResult],
                    ['Reflection', story.starReflection],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">{label}</p>
                      <p className="text-zinc-300 text-xs leading-relaxed">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
