"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import CohortChart from "@/components/faculty/CohortChart";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import StatCard from "@/components/StatCard";

interface Analytics {
  totalStudents: number;
  avgReadiness: number;
  appsThisWeek: number;
  totalJobs: number;
  placementsConfirmed: number;
  topGaps: { skill: string; count: number }[];
}

export default function FacultyAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Cohort Analytics">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard icon={<Users size={20} />} label="Students" value={String(data?.totalStudents ?? 0)} trend="Total Registered" trendUp />
              <StatCard icon={<BarChart3 size={20} />} label="Avg Readiness" value={`${data?.avgReadiness ?? 0}%`} trend="Cohort Average" trendUp />
              <StatCard icon={<TrendingUp size={20} />} label="Placements" value={String(data?.placementsConfirmed ?? 0)} trend="This Year" trendUp />
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-6">Top Skill Gaps — Cohort Wide</h2>
              <CohortChart data={data?.topGaps ?? []} />
            </div>
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
