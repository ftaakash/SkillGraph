'use client'
import { useEffect, useState } from 'react'

interface SkillItem { skill: string; count: number }
interface MarketData { topSkills: SkillItem[]; role: string; totalJobsAnalyzed: number; week: number; lastUpdated: string }

const roles = ['All Roles', 'Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev']
const tabs = ['Skill Demand', 'Live Job Search', 'Salary Explorer']

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState('Skill Demand')
  
  // Tab 1: Skill Demand State
  const [data, setData] = useState<MarketData | null>(null)
  const [role, setRole] = useState('All Roles')
  const [loading, setLoading] = useState(true)

  // Tab 2: Job Search State
  const [jobQuery, setJobQuery] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false)

  // Tab 3: Salary State
  const [salaryTitle, setSalaryTitle] = useState('')
  const [salaryLocation, setSalaryLocation] = useState('India')
  const [salaries, setSalaries] = useState<any[]>([])
  const [searchingSalary, setSearchingSalary] = useState(false)

  // Load Skill Demand Data
  useEffect(() => {
    if (activeTab === 'Skill Demand') {
      setLoading(true)
      const q = role === 'All Roles' ? '' : `?role=${encodeURIComponent(role)}`
      fetch(`/api/market/skills${q}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
    }
  }, [role, activeTab])

  const maxCount = data?.topSkills?.[0]?.count ?? 1
  const colors = ['from-blue-500 to-blue-600', 'from-violet-500 to-violet-600', 'from-cyan-500 to-cyan-600', 'from-emerald-500 to-emerald-600', 'from-orange-500 to-orange-600']

  // Handlers
  const handleSearchJobs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobQuery) return
    setSearchingJobs(true); setSelectedJob(null)
    const res = await fetch(`/api/market/search?query=${encodeURIComponent(jobQuery)}`).then(r => r.json())
    setJobs(res.data ?? [])
    setSearchingJobs(false)
  }

  const handleGetJobDetails = async (jobId: string) => {
    setJobDetailsLoading(true)
    const res = await fetch(`/api/market/job-details?job_id=${encodeURIComponent(jobId)}`).then(r => r.json())
    setSelectedJob(res.data)
    setJobDetailsLoading(false)
  }

  const handleSearchSalary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salaryTitle) return
    setSearchingSalary(true)
    const res = await fetch(`/api/market/company-salary?job_title=${encodeURIComponent(salaryTitle)}&location=${encodeURIComponent(salaryLocation)}`).then(r => r.json())
    setSalaries(res.data ?? [])
    setSearchingSalary(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Skill <span className="text-[#3B82F6]">Market</span> & Insights
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Real-time industrial data powered by RapidAPI & Deep Learning. Benchmark your
            academic curriculum against live hiring pipelines globally.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-[#1C212B] mb-8">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB 1: SKILL DEMAND */}
      {activeTab === 'Skill Demand' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-2 flex-wrap mb-6">
            {roles.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${role === r ? 'bg-[#1C64F2] border-[#1C64F2] text-white' : 'bg-[#141824] border-[#1C212B] text-gray-400 hover:text-white'}`}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-[#141824] border border-[#1C212B] rounded-2xl p-8">
            <h2 className="text-lg font-bold mb-6 text-white">Top Required Skills</h2>
            {loading ? <div className="text-gray-500 font-bold text-sm tracking-widest animate-pulse">EXTRACTING METADATA...</div> : data?.topSkills?.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No data indexed for this architecture.</div>
            ) : (
              <div className="space-y-6">
                {data?.topSkills?.map(({ skill, count }, i) => (
                  <div key={skill} className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-500 font-black tracking-widest w-6 text-right uppercase">0{i + 1}</span>
                    <span className="text-sm font-bold w-48 truncate text-gray-200">{skill}</span>
                    <div className="flex-1 bg-[#0A0D14] border border-[#1C212B] rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700 shadow-[0_0_10px_rgba(59,130,246,0.3)]`}
                        style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 font-bold w-12 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE JOB SEARCH */}
      {activeTab === 'Live Job Search' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5 bg-[#141824] border border-[#1C212B] rounded-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b border-[#1C212B]">
              <form onSubmit={handleSearchJobs} className="flex gap-2">
                <input value={jobQuery} onChange={e => setJobQuery(e.target.value)} placeholder="e.g. Node Developer in London"
                 className="flex-1 bg-[#0A0D14] border border-[#2D3544] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition" />
                <button type="submit" disabled={searchingJobs} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 px-6 rounded-lg text-sm font-bold disabled:opacity-50 transition shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  {searchingJobs ? '...' : 'Query'}
                </button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {jobs.map(j => (
                <button key={j.job_id} onClick={() => handleGetJobDetails(j.job_id)}
                  className="w-full text-left p-4 rounded-xl hover:bg-[#1C212B] transition border border-transparent focus:border-blue-500 group">
                  <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition">{j.job_title}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{j.employer_name} <span className="mx-1 text-[#2D3544]">|</span> {j.job_city || j.job_country}</p>
                </button>
              ))}
              {!searchingJobs && jobs.length === 0 && <p className="text-xs font-bold tracking-widest text-center text-gray-600 mt-10 uppercase">Awaiting Query Parameters</p>}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 bg-[#141824] border border-[#1C212B] rounded-2xl p-8 overflow-y-auto h-[70vh]">
            {jobDetailsLoading ? <div className="text-blue-500 font-bold tracking-widest text-[10px] uppercase animate-pulse">Initializing Data Stream...</div> : selectedJob ? (
              <div className="animate-in fade-in">
                <span className="bg-[#1C212B] text-blue-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded w-fit uppercase mb-4 block">Job Intelligence</span>
                <h2 className="text-3xl font-bold mb-1 text-white">{selectedJob.job_title}</h2>
                <p className="text-blue-400 font-bold text-sm mb-6">{selectedJob.employer_name}</p>
                
                <div className="flex gap-3 flex-wrap mb-8">
                  <span className="bg-[#0A0D14] border border-[#2D3544] text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg">📍 {selectedJob.job_city}, {selectedJob.job_state}</span>
                  <span className="bg-[#0A0D14] border border-[#2D3544] text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg">🏢 {selectedJob.job_employment_type}</span>
                  {selectedJob.job_is_remote && <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold px-3 py-1.5 rounded-lg">Remote Verified</span>}
                </div>

                <div className="flex gap-4 mb-10 pb-10 border-b border-[#1C212B]">
                  <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer" 
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">Apply Now</a>
                  <a href={selectedJob.employer_website} target="_blank" rel="noopener noreferrer"
                    className="bg-[#1C212B] hover:bg-[#2D3544] border border-[#2D3544] text-white px-6 py-3 rounded-lg text-sm font-bold transition">Company Architecture</a>
                </div>

                <div className="prose prose-invert max-w-none text-sm text-gray-300">
                  <h3 className="text-white font-bold tracking-wide uppercase text-xs mb-4">Technical Description</h3>
                  <div className="whitespace-pre-wrap leading-relaxed bg-[#0A0D14] border border-[#1C212B] p-6 rounded-xl text-gray-400">{selectedJob.job_description}</div>
                </div>

                {selectedJob.employer_reviews?.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-white font-bold tracking-wide uppercase text-xs mb-4">Verified Network Reviews</h3>
                    <div className="space-y-4">
                      {selectedJob.employer_reviews.map((r: any, i: number) => (
                        <div key={i} className="bg-[#0A0D14] border border-[#1C212B] p-5 rounded-xl text-sm leading-relaxed">
                          <span className="font-bold text-yellow-500 mb-2 block tracking-widest">RANK: ★ {r.score}</span>
                          <span className="text-gray-400">{r.review}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <p className="text-center font-bold tracking-widest text-[#2D3544] text-[10px] mt-32 uppercase">No Entity Selected</p>}
          </div>
        </div>
      )}

      {/* TAB 3: SALARY EXPLORER */}
      {activeTab === 'Salary Explorer' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[#141824] border border-[#1C212B] rounded-2xl p-8 mb-6">
            <h2 className="text-lg font-bold mb-6 text-white">Compensation Analytics</h2>
            <form onSubmit={handleSearchSalary} className="flex flex-col md:flex-row gap-4 max-w-3xl">
              <input value={salaryTitle} onChange={e => setSalaryTitle(e.target.value)} placeholder="Role (e.g. Logic Engineer)"
                 className="flex-1 bg-[#0A0D14] border border-[#2D3544] rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none transition" />
              <input value={salaryLocation} onChange={e => setSalaryLocation(e.target.value)} placeholder="Zone (e.g. Austin, TX)"
                 className="flex-1 bg-[#0A0D14] border border-[#2D3544] rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none transition" />
              <button type="submit" disabled={searchingSalary} className="bg-blue-600 px-8 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-blue-500 transition whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                {searchingSalary ? 'Mining...' : 'Execute Scan'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salaries.map((sal, i) => (
              <div key={i} className="bg-[#141824] border border-[#1C212B] rounded-2xl p-6 hover:border-blue-500/50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition">{sal.job_title}</h3>
                    <p className="text-gray-400 text-xs mt-1 font-medium">{sal.location}</p>
                  </div>
                  <span className="bg-[#1C212B] text-gray-300 text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded">PUB: {sal.publisher_name}</span>
                </div>
                
                <div className="mt-8 flex flex-col gap-3">
                  <div className="flex justify-between items-end border-b border-[#1C212B] pb-3">
                    <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">Median Benchmark</span>
                    <span className="font-black text-green-400 text-xl shadow-green-400/20 drop-shadow-lg text-right">
                      ${Math.round(sal.median_salary ?? 0).toLocaleString()} <span className="text-[10px] font-bold text-green-500/50 uppercase">/yr</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Calculated Range</span>
                    <span className="font-medium text-gray-300">${Math.round(sal.min_salary ?? 0).toLocaleString()} <span className="text-gray-600 mx-1">-</span> ${Math.round(sal.max_salary ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {!searchingSalary && salaries.length === 0 && <p className="text-[#2D3544] text-[10px] font-bold tracking-widest uppercase col-span-3">No Active Queries.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
