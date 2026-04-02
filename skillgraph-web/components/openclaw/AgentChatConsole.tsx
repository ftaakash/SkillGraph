"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bot, Send } from "lucide-react"

export default function AgentChatConsole() {
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'advisor', content: string}[]>([
    { role: 'advisor', content: "Namaste! I'm your Indian Tech Market Advisor. Ask me about CTC expectations, target companies, or specific tech stacks in cities like Bangalore or Pune." }
  ])
  const [chatLoading, setChatLoading] = useState(false)

  const handleAskAdvisor = async () => {
    if (!chatMessage.trim() || chatLoading) return
    const userMsg = chatMessage
    setChatMessage("")
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/india-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      })
      const result = await res.json()
      if (result.answer) {
        setChatHistory(prev => [...prev, { role: 'advisor', content: result.answer }])
      } else {
        setChatHistory(prev => [...prev, { role: 'advisor', content: "Oops, something went wrong fetching the answer. Please try again." }])
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'advisor', content: "Network error occurred." }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0c0c0e] flex flex-col h-[700px] overflow-hidden shadow-xl shadow-black/50">
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-3">
        <div className="relative">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">AI Career Advisor</h3>
          <p className="text-[11px] text-zinc-500">Specialized for the Indian market</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
        {chatHistory.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
           {msg.role === 'advisor' && (
             <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
               <Bot className="w-4 h-4" />
             </div>
           )}
           <div 
            className={`px-4 py-3 rounded-2xl max-w-[85%] text-[13px] leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white rounded-tr-sm' 
                : 'bg-zinc-800/80 text-zinc-200 rounded-tl-sm border border-zinc-700/50'
            }`}
           >
            {msg.content}
           </div>
          </motion.div>
        ))}
        {chatLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
               <Bot className="w-4 h-4 text-indigo-400" />
             </div>
             <div className="px-5 py-4 bg-zinc-800/80 rounded-2xl rounded-tl-sm w-16 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/40">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleAskAdvisor(); }}
          className="relative flex items-center"
        >
          <input 
            type="text" 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Ask about fresher CTC at TCS..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-full py-3 pl-4 pr-12 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
            disabled={chatLoading}
          />
          <button 
            type="submit" 
            disabled={!chatMessage.trim() || chatLoading}
            className="absolute right-2 p-2 rounded-full bg-indigo-500 text-white disabled:opacity-50 disabled:bg-zinc-700 transition-colors hover:bg-indigo-400"
          >
            <Send className="w-4 h-4 mr-[1px]" />
          </button>
        </form>
      </div>

    </div>
  )
}
