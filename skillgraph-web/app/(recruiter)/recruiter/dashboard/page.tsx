"use client";

import { useEffect, useState } from "react";
import { Search, Star, Briefcase, TrendingUp, Users, PlusCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";

interface RecruiterStats {
  talentPoolSize: number;
  shortlistedCount: number;
  activeJobs: number;
  pipelineCount: number;
}

export default function RecruiterDashboardPage() {
  const [stats, setStats] = useState<RecruiterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/talent?count=true")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? {
          talentPoolSize: 0,
          shortlistedCount: 0,
          activeJobs: 0,
          pipelineCount: 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setStats({ talentPoolSize: 0, shortlistedCount: 0, activeJobs: 0, pipelineCount: 0 });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Recruiter Portal">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PageTransition>
      <DashboardLayout title="Recruiter Portal">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={20} />} label="Talent Pool" value={String(stats?.talentPoolSize ?? 0)} trend="Visible Profiles" trendUp />
          <StatCard icon={<Star size={20} />} label="Shortlisted" value={String(stats?.shortlistedCount ?? 0)} trend="Candidates" trendUp />
          <StatCard icon={<Briefcase size={20} />} label="Active Jobs" value={String(stats?.activeJobs ?? 0)} trend="Posted" trendUp />
          <StatCard icon={<TrendingUp size={20} />} label="Pipeline" value={String(stats?.pipelineCount ?? 0)} trend="In Progress" trendUp />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <a href="/recruiter/talent" className="bg-card border border-border rounded-lg p-6 shadow-sm hover:border-primary/40 transition-colors block group">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Search size={18} className="text-primary" /> Discover Talent
            </h2>
            <p className="text-sm text-muted-foreground">Search anonymized student profiles filtered by skills, readiness score, and role.</p>
            <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">Browse Talent Pool →</span>
          </a>

          <a href="/recruiter/jobs/new" className="bg-card border border-border rounded-lg p-6 shadow-sm hover:border-primary/40 transition-colors block group">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <PlusCircle size={18} className="text-primary" /> Post a Job
            </h2>
            <p className="text-sm text-muted-foreground">Create a new job posting visible to campus placement cells and verified students.</p>
            <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">Create Posting →</span>
          </a>
        </div>

        {/* Verification Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="font-heading text-md font-semibold text-foreground mb-1">Company Verification</h3>
          <p className="text-sm text-muted-foreground">Your company must be verified before you can access student profiles. Verification typically takes 24-48 hours after registration.</p>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
