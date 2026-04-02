"use client";

import { useEffect, useState } from "react";
import { Users, BarChart3, Briefcase, Building2, TrendingUp, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";

interface FacultyStats {
  totalStudents: number;
  avgReadiness: number;
  applicationsThisWeek: number;
  placementsConfirmed: number;
  activeJobs: number;
  topGaps: { skill: string; count: number }[];
}

export default function FacultyDashboardPage() {
  const [stats, setStats] = useState<FacultyStats | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/faculty/analytics").then((r) => r.json()),
      fetch("/api/faculty/jobs").then((r) => r.json())
    ])
      .then(([statsData, jobsData]) => {
        setStats(statsData ?? {
          totalStudents: 0,
          avgReadiness: 0,
          applicationsThisWeek: 0,
          placementsConfirmed: 0,
          activeJobs: 0,
          topGaps: [],
        });
        setJobs(jobsData.jobs || []);
        setLoading(false);
      })
      .catch(() => {
        setStats({
          totalStudents: 0,
          avgReadiness: 0,
          applicationsThisWeek: 0,
          placementsConfirmed: 0,
          activeJobs: 0,
          topGaps: [],
        });
        setJobs([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Placement Cell">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PageTransition>
      <DashboardLayout title="Placement Cell">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={20} />} label="Registered Students" value={String(stats?.totalStudents ?? 0)} trend="College-wide" trendUp />
          <StatCard icon={<TrendingUp size={20} />} label="Avg Readiness" value={`${Math.round(stats?.avgReadiness ?? 0)}%`} trend="Cohort Score" trendUp={(stats?.avgReadiness ?? 0) > 50} />
          <StatCard icon={<Briefcase size={20} />} label="Active Jobs" value={String(stats?.activeJobs ?? 0)} trend="Posted" trendUp />
          <StatCard icon={<CheckCircle2 size={20} />} label="Placements" value={String(stats?.placementsConfirmed ?? 0)} trend="Confirmed" trendUp />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-primary" /> Recent Job Postings
            </h2>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                    <h3 className="font-semibold text-sm text-foreground">{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{job.company}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No job postings yet. Create your first campus drive posting to get started.</p>
            )}
            <a href="/faculty/jobs/new" className="inline-block mt-4 px-4 py-2 text-sm font-semibold rounded-lg gradient-primary text-primary-foreground glow-primary">
              Post New Job
            </a>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" /> Cohort Skill Gaps
            </h2>
            {stats?.topGaps && stats.topGaps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.topGaps.map((gap) => (
                  <span key={gap.skill} className="bg-destructive/10 border border-destructive/20 text-destructive px-2.5 py-1 rounded text-xs font-semibold">{gap.skill}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Skill gap analytics will appear once students upload resumes.</p>
            )}
          </div>
        </div>

        {/* Applications Summary */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> Applications This Week
          </h2>
          <div className="text-4xl font-heading font-black text-foreground mb-2">{stats?.applicationsThisWeek ?? 0}</div>
          <p className="text-sm text-muted-foreground">Student applications submitted across all active postings.</p>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
