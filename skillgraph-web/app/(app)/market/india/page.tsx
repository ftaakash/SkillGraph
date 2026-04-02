"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import DashboardLayout from "@/components/DashboardLayout"
import PageTransition from "@/components/PageTransition"
import AgentChatConsole from "@/components/openclaw/AgentChatConsole"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { MapPin, TrendingUp, IndianRupee, Sparkles, AlertCircle } from "lucide-react"

interface MarketData {
  topSkills: { skill: string, count: number }[]
  avgCtcByTier: { tier: string, avgCtc: number }[]
  cityDemand: { city: string, percentage: number }[]
}

const SHADCN_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function IndianMarketPage() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market/india')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  return (
    <DashboardLayout title="Indian Market Intelligence">
      <PageTransition>
        <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto pb-10">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-light text-white tracking-tight">Hiring Trends <span className="font-semibold text-emerald-400">India</span></h1>
              <p className="text-zinc-400 mt-1 max-w-2xl">Real-time market insights aggregated from Naukri, Glassdoor India, and AmbitionBox, tailored for the Indian tech ecosystem.</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Live Data
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium">
                Updated this week
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-500/10 rounded-lg shrink-0">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-100">Most Demanded Skills</h2>
                    <p className="text-xs text-zinc-500">Based on active job listings in Indian tech hubs</p>
                  </div>
                </div>

                <div className="h-[280px] w-full">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    </div>
                  ) : data?.topSkills?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topSkills.slice(0, 8)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <XAxis 
                          dataKey="skill" 
                          stroke="#52525b" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="#52525b" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val}`}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {data.topSkills.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={SHADCN_COLORS[index % SHADCN_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
                       <AlertCircle className="w-4 h-4" /> No data available for this week.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                   <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg shrink-0">
                      <IndianRupee className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium text-zinc-100">Avg Fresher CTC</h2>
                      <p className="text-xs text-zinc-500">Packages by company tier (₹ LPA)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="animate-pulse space-y-3">
                        {[1,2,3,4].map(i => <div key={i} className="h-8 bg-zinc-800 rounded-md" />)}
                      </div>
                    ) : data?.avgCtcByTier?.length ? (
                      data.avgCtcByTier.map((t, idx) => (
                        <div key={t.tier} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium">{t.tier}</span>
                            <span className="text-emerald-400 font-semibold">{t.avgCtc.toFixed(1)} LPA</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((t.avgCtc / 25) * 100, 100)}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-500">No CTC data found.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-purple-500/10 rounded-lg shrink-0">
                      <MapPin className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium text-zinc-100">Hiring Hotspots</h2>
                      <p className="text-xs text-zinc-500">Active demand distribution</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="animate-pulse space-y-3">
                        {[1,2,3,4].map(i => <div key={i} className="h-8 bg-zinc-800 rounded-md" />)}
                      </div>
                    ) : data?.cityDemand?.length ? (
                      data.cityDemand.map((c, idx) => (
                        <div key={c.city} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 w-20 shrink-0 truncate">{c.city}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${c.percentage}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className="h-full bg-purple-500 rounded-full"
                            />
                          </div>
                          <span className="text-xs font-medium text-zinc-300 w-8 text-right">{c.percentage}%</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-500">No location data found.</div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="h-[700px] w-full">
              <AgentChatConsole />
            </div>

          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  )
}
