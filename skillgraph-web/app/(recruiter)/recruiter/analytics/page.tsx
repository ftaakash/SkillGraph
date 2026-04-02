"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import CohortChart from "@/components/faculty/CohortChart";
import { Eye, Star, CheckCircle2, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalViewed: number;
  shortlisted: number;
  hired: number;
  topSkills: { skill: string; count: number }[];
}

export default function RecruiterAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Recruitment Analytics">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard icon={<Eye size={20} />} label="Profiles Viewed" value={String(data?.totalViewed ?? 0)} trend="Total" trendUp />
              <StatCard icon={<Star size={20} />} label="Shortlisted" value={String(data?.shortlisted ?? 0)} trend="Candidates" trendUp />
              <StatCard icon={<CheckCircle2 size={20} />} label="Hired" value={String(data?.hired ?? 0)} trend="Confirmed" trendUp />
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Most Common Skills in Talent Pool
              </h2>
              <CohortChart data={data?.topSkills ?? []} />
            </div>
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
