"use client";

import { useEffect, useState } from 'react';
import { Award, BarChart3, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";

interface BucketItem { range: string; count: number }
interface BenchmarkData { buckets: BucketItem[]; cohortBuckets?: BucketItem[]; median: number; top10Threshold: number; totalStudents: number; cohortMedian?: number; cohortTop10Threshold?: number; cohortTotalStudents?: number; hasCohortDetails?: boolean; }
interface Skill { id: string; skillName: string; category: string; proficiency: string }

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [role, setRole] = useState('Industrial AI Engineer');
  const [viewMode, setViewMode] = useState<'global' | 'cohort'>('global');
  const [skills, setSkills] = useState<Skill[]>([]);
  const roles = ['Industrial AI Engineer', 'Data Analyst', 'ML Engineer', 'DevOps Engineer', 'Full Stack Dev'];

  useEffect(() => {
    fetch(`/api/benchmarks?role=${role}`).then(r => r.json()).then(setData);
    fetch('/api/users/me').then(r => r.json()).then(d => setUserScore(d.user?.readinessScore ?? null));
    fetch('/api/skills').then(r => r.json()).then(sk => setSkills(sk.skills ?? []));
  }, [role]);

  const activeBuckets = viewMode === 'global' ? data?.buckets : data?.cohortBuckets;
  const maxCount = activeBuckets ? Math.max(...activeBuckets.map(b => b.count), 1) : 1;
  const userBucket = userScore !== null ? Math.min(Math.floor(userScore / 10) * 10, 90) : null;
  
  const mapProficiency = (prof: string) => {
    switch (prof.toLowerCase()) {
      case 'beginner': return 35;
      case 'intermediate': return 70;
      case 'advanced': return 95;
      default: return 50;
    }
  };

  return (
    <PageTransition>
      <DashboardLayout title="Market Benchmarks">
        {/* Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex gap-2 flex-wrap mb-2 lg:mb-0">
            {roles.map(r => (
              <Button
                key={r}
                onClick={() => setRole(r)}
                variant={role === r ? "default" : "outline"}
                className={role === r ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"}
              >
                {r.toUpperCase()}
              </Button>
            ))}
          </div>

          {data?.hasCohortDetails && (
            <div className="flex bg-muted rounded-lg p-1 border border-border">
              <button
                onClick={() => setViewMode('global')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'global' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Global
              </button>
              <button
                onClick={() => setViewMode('cohort')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'cohort' ? 'bg-primary text-primary-foreground shadow glow-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                My College
              </button>
            </div>
          )}
        </div>

        {/* Metrics Stack */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <StatCard icon={<Award size={20} />} label={viewMode === 'global' ? "Global Median" : "Cohort Median"} value={data ? (viewMode === 'global' ? `${data.median}%` : `${data.cohortMedian}%`) : '...'} trend={data ? `Top 10%: ${viewMode === 'global' ? data.top10Threshold : data.cohortTop10Threshold}+` : ''} trendUp />
           <StatCard icon={<BarChart3 size={20} />} label="Floor Percentile" value={userScore !== null ? `${Math.round(userScore)}th` : 'N/A'} trend="Your Match Score" trendUp={userScore !== null && userScore > (data?.median || 0)} />
           <StatCard icon={<TrendingUp size={20} />} label="Total Profiles" value={data ? (viewMode === 'global' ? data.totalStudents.toString() : data.cohortTotalStudents?.toString() || '0') : '...'} trend={`In ${role}`} trendUp />
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Chart Section */}
          <div className="col-span-12 lg:col-span-8 bg-card border border-border rounded-lg p-8 relative overflow-hidden shadow-sm">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-8">Distribution Curve</h3>

            {data && data.totalStudents === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-lg bg-muted/50">
                <BarChart3 className="mx-auto text-muted-foreground mb-4" size={32} />
                <p className="text-muted-foreground text-sm font-medium">No benchmark data mapped for this sector yet.</p>
              </div>
            ) : (
              <div className="relative h-64 flex items-end justify-center gap-2 mt-10 z-10">
                {activeBuckets?.map(({ range, count }) => {
                  const isUser = userBucket !== null && parseInt(range) === userBucket;
                  const heightPct = Math.max((count / maxCount) * 100, count > 0 ? 5 : 0);

                  return (
                    <div key={range} className="relative flex flex-col items-center flex-1 group h-full">
                      <div className="w-full flex justify-center h-full items-end relative">
                        {isUser && (
                          <div className="absolute -top-8 text-xs text-primary font-bold whitespace-nowrap glow-text pointer-events-none">
                             You
                          </div>
                        )}
                        
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border text-foreground text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap font-medium shadow-md">
                          Count: {count}
                        </div>

                        <div className={`w-full rounded-t transition-all duration-700 ${isUser ? 'gradient-primary glow-primary' : 'bg-muted-foreground/20 group-hover:bg-muted-foreground/40'}`}
                          style={{ height: `${heightPct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase mt-2">{range}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Per-skill percentiles (mapped from user proficiency as a proxy) */}
          <div className="col-span-12 lg:col-span-4 bg-card border border-border rounded-lg p-8">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-6">Skill Valuations</h2>
            {skills.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-8">No skills mapped.</p>
            ) : (
              <div className="space-y-6">
                {skills.slice(0, 6).map((sk) => {
                  const p = mapProficiency(sk.proficiency);
                  return (
                  <div key={sk.id} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                       <span className="text-foreground">{sk.skillName}</span>
                       <span className="text-primary font-semibold">{p}th</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
