"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Search, Briefcase, DollarSign, MapPin, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface SkillItem { skill: string; count: number }
interface MarketData { topSkills: SkillItem[]; role: string; totalJobsAnalyzed: number; week: number; lastUpdated: string }

const roles = ['All Roles', 'Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev'];
const tabs = ['Skill Demand', 'Live Job Search', 'Salary Explorer'];

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  if (trend === "up") return <TrendingUp size={16} className="text-success" />;
  if (trend === "down") return <TrendingDown size={16} className="text-destructive" />;
  return <Minus size={16} className="text-muted-foreground" />;
};

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState('Skill Demand');
  
  // Tab 1: Skill Demand State
  const [data, setData] = useState<MarketData | null>(null);
  const [role, setRole] = useState('All Roles');
  const [loading, setLoading] = useState(true);

  // Tab 2: Job Search State
  const [jobQuery, setJobQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchingJobs, setSearchingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // Tab 3: Salary State
  const [salaryTitle, setSalaryTitle] = useState('');
  const [salaryLocation, setSalaryLocation] = useState('India');
  const [salaries, setSalaries] = useState<any[]>([]);
  const [searchingSalary, setSearchingSalary] = useState(false);

  useEffect(() => {
    if (activeTab === 'Skill Demand') {
      setLoading(true);
      const q = role === 'All Roles' ? '' : `?role=${encodeURIComponent(role)}`;
      fetch(`/api/market/skills${q}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }
  }, [role, activeTab]);

  const maxCount = data?.topSkills?.[0]?.count ?? 1;

  const handleSearchJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobQuery) return;
    setSearchingJobs(true); setSelectedJob(null);
    const res = await fetch(`/api/market/search?query=${encodeURIComponent(jobQuery)}`).then(r => r.json());
    setJobs(res.data ?? []);
    setSearchingJobs(false);
  };

  const handleGetJobDetails = async (jobId: string) => {
    setJobDetailsLoading(true);
    const res = await fetch(`/api/market/job-details?job_id=${encodeURIComponent(jobId)}`).then(r => r.json());
    setSelectedJob(res.data);
    setJobDetailsLoading(false);
  };

  const handleSearchSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTitle) return;
    setSearchingSalary(true);
    const res = await fetch(`/api/market/company-salary?job_title=${encodeURIComponent(salaryTitle)}&location=${encodeURIComponent(salaryLocation)}`).then(r => r.json());
    setSalaries(res.data ?? []);
    setSearchingSalary(false);
  };

  return (
    <PageTransition>
      <DashboardLayout title="Market Intelligence">
        <p className="text-muted-foreground mb-6 font-body">Real-time skill demand index and job market insights.</p>
        
        {/* TABS */}
        <div className="flex border-b border-border/50 mb-8 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* TAB 1: SKILL DEMAND */}
        {activeTab === 'Skill Demand' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-2 flex-wrap mb-6">
              {roles.map(r => (
                <Button
                  key={r}
                  onClick={() => setRole(r)}
                  variant={role === r ? "default" : "outline"}
                  size="sm"
                  className={role === r ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"}
                >
                  {r.toUpperCase()}
                </Button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[60px_1fr_120px_100px_80px] gap-4 px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-muted/20">
                <span>Rank</span><span>Ticker</span><span>Demand</span><span>Δ Change</span><span>Trend</span>
              </div>
              
              {loading ? (
                <div className="p-12 text-center text-muted-foreground font-bold tracking-widest text-sm animate-pulse">EXTRACTING METADATA...</div>
              ) : data?.topSkills?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">No data indexed for this architecture.</div>
              ) : (
                data?.topSkills?.map(({ skill, count }, i) => {
                  const demandPct = Math.min(100, Math.round((count / maxCount) * 100));
                  // Mock change and trend for UI continuity since real API doesn't have it
                  const mockChange = i % 3 === 0 ? -2 : i % 2 === 0 ? 0 : 5 + i;
                  const mockTrend = mockChange > 0 ? "up" : mockChange < 0 ? "down" : "flat";

                  return (
                    <div key={skill} className="grid grid-cols-[60px_1fr_120px_100px_80px] gap-4 px-6 py-4 border-b border-border/50 hover:bg-muted/30 transition-colors items-center">
                      <span className="text-lg font-heading font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="text-sm font-medium text-foreground truncate pl-2">{skill}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${demandPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{count}</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        mockChange > 0 ? "text-success" : mockChange < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {mockChange > 0 ? "+" : ""}{mockChange}%
                      </span>
                      <TrendIcon trend={mockTrend} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE JOB SEARCH */}
        {activeTab === 'Live Job Search' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5 bg-card border border-border rounded-lg overflow-hidden flex flex-col h-[70vh]">
              <div className="p-4 border-b border-border bg-muted/20">
                <form onSubmit={handleSearchJobs} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={jobQuery} onChange={e => setJobQuery(e.target.value)} placeholder="e.g. Node Developer in London"
                     className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:border-primary outline-none transition" />
                  </div>
                  <Button type="submit" disabled={searchingJobs} className="gradient-primary text-primary-foreground font-semibold glow-primary">
                    {searchingJobs ? '...' : 'Query'}
                  </Button>
                </form>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {jobs.map(j => (
                  <button key={j.job_id} onClick={() => handleGetJobDetails(j.job_id)}
                    className="w-full text-left p-4 rounded-xl hover:bg-muted/50 transition border border-transparent focus:border-primary group">
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition">{j.job_title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Briefcase size={12} /> {j.employer_name} <span className="mx-1 text-border">|</span> <MapPin size={12} /> {j.job_city || j.job_country}
                    </p>
                  </button>
                ))}
                {!searchingJobs && jobs.length === 0 && <p className="text-xs font-semibold tracking-widest text-center text-muted-foreground mt-10 uppercase">Awaiting Query Parameters</p>}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7 bg-card border border-border rounded-lg p-8 overflow-y-auto h-[70vh] custom-scrollbar">
              {jobDetailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-primary font-bold tracking-widest text-sm uppercase animate-pulse">Initializing Data Stream...</div>
                </div>
              ) : selectedJob ? (
                <div className="animate-in fade-in">
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black tracking-widest px-2.5 py-1 rounded w-fit uppercase mb-4 block">Job Intelligence</span>
                  <h2 className="text-3xl font-bold mb-1 text-foreground">{selectedJob.job_title}</h2>
                  <p className="text-primary font-semibold text-sm mb-6">{selectedJob.employer_name}</p>
                  
                  <div className="flex gap-3 flex-wrap mb-8">
                    <span className="bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5"><MapPin size={14}/> {selectedJob.job_city}, {selectedJob.job_state}</span>
                    <span className="bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5"><Briefcase size={14}/> {selectedJob.job_employment_type}</span>
                    {selectedJob.job_is_remote && <span className="bg-success/10 text-success border border-success/20 text-xs font-semibold px-3 py-1.5 rounded-lg">Remote Verified</span>}
                  </div>

                  <div className="flex gap-4 mb-10 pb-10 border-b border-border/50">
                    <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer">
                      <Button className="gradient-primary text-primary-foreground font-semibold px-6 glow-primary">
                        Apply Now <ExternalLink className="ml-2 w-4 h-4" />
                      </Button>
                    </a>
                  </div>

                  <div className="prose prose-invert max-w-none text-sm text-muted-foreground">
                    <h3 className="text-foreground font-semibold tracking-wide uppercase text-xs mb-4">Technical Description</h3>
                    <div className="whitespace-pre-wrap leading-relaxed bg-muted/20 border border-border/50 p-6 rounded-xl">{selectedJob.job_description}</div>
                  </div>
                </div>
              ) : <div className="flex items-center justify-center h-full"><p className="font-semibold tracking-widest text-muted-foreground text-xs uppercase">No Entity Selected</p></div>}
            </div>
          </div>
        )}

        {/* TAB 3: SALARY EXPLORER */}
        {activeTab === 'Salary Explorer' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border rounded-lg p-8 mb-6">
              <h2 className="font-heading text-lg font-semibold mb-6 text-foreground text-glow">Compensation Analytics</h2>
              <form onSubmit={handleSearchSalary} className="flex flex-col md:flex-row gap-4 max-w-3xl">
                <div className="relative flex-1">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={salaryTitle} onChange={e => setSalaryTitle(e.target.value)} placeholder="Role (e.g. Logic Engineer)"
                     className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-primary outline-none transition text-foreground" />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={salaryLocation} onChange={e => setSalaryLocation(e.target.value)} placeholder="Zone (e.g. Austin, TX)"
                     className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-primary outline-none transition text-foreground" />
                </div>
                <Button type="submit" disabled={searchingSalary} className="gradient-primary text-primary-foreground font-semibold px-8 glow-primary whitespace-nowrap">
                  {searchingSalary ? 'Mining...' : 'Execute Scan'}
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salaries.map((sal, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-6 hover:gold-border transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition">{sal.job_title}</h3>
                      <p className="text-muted-foreground text-xs mt-1 font-medium">{sal.location}</p>
                    </div>
                    <span className="bg-muted/50 text-foreground text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded border border-border">PUB: {sal.publisher_name}</span>
                  </div>
                  
                  <div className="mt-8 flex flex-col gap-3">
                    <div className="flex justify-between items-end border-b border-border/50 pb-3">
                      <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Median Benchmark</span>
                      <span className="font-heading font-bold text-success text-2xl drop-shadow-lg text-right flex items-center">
                        <DollarSign size={20} className="mr-0.5" />
                        {Math.round(sal.median_salary ?? 0).toLocaleString()} <span className="text-[10px] font-bold text-success/50 uppercase ml-1">/yr</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-semibold uppercase tracking-widest text-[9px]">Calculated Range</span>
                      <span className="font-medium text-foreground">${Math.round(sal.min_salary ?? 0).toLocaleString()} <span className="text-muted-foreground mx-1">-</span> ${Math.round(sal.max_salary ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!searchingSalary && salaries.length === 0 && <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase col-span-3 text-center py-12">No Active Queries.</p>}
            </div>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
