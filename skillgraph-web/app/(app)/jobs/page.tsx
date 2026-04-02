"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Briefcase, Calendar, DollarSign, ChevronRight, CheckCircle2, XCircle, Zap, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  ctcMin: number | null;
  ctcMax: number | null;
  minCgpa: number | null;
  eligibleBranches: string[];
  deadline: string;
  driveDate: string | null;
  applicationCount: number;
}

interface UserProfile {
  cgpa: number | null;
  branch: string | null;
  skills: { skillName: string }[];
  targetRole: string | null;
}

function computeMatchScore(job: Job, profile: UserProfile): number {
  // Simple heuristic match: compare role keywords and branch eligibility
  let score = 50; // base score

  // Branch match
  if (job.eligibleBranches && job.eligibleBranches.length > 0 && profile.branch) {
    if (job.eligibleBranches.includes(profile.branch)) score += 15;
    else score -= 20;
  }

  // CGPA eligibility
  if (job.minCgpa && profile.cgpa) {
    if (profile.cgpa >= job.minCgpa) score += 10;
    else score -= 15;
  }

  // Keyword match from description vs skills
  if (profile.skills.length > 0) {
    const desc = (job.title + " " + job.description).toLowerCase();
    const matched = profile.skills.filter(s => desc.includes(s.skillName.toLowerCase()));
    const skillMatchPct = matched.length / Math.max(profile.skills.length, 1);
    score += Math.round(skillMatchPct * 25);
  }

  return Math.max(10, Math.min(99, score));
}

export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs").then(r => r.json()),
      fetch("/api/users/me").then(r => r.json()).catch(() => null),
    ]).then(([jobsData, profileData]) => {
      setJobs(jobsData.jobs ?? []);
      if (profileData) {
        setProfile({
          cgpa: profileData.cgpa ?? null,
          branch: profileData.branch ?? null,
          skills: profileData.skills ?? [],
          targetRole: profileData.targetRole ?? null,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const daysLeft = (deadline: string) => {
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const isEligible = (job: Job) => {
    if (!profile) return true;
    if (job.minCgpa && profile.cgpa && profile.cgpa < job.minCgpa) return false;
    if (job.eligibleBranches?.length > 0 && profile.branch && !job.eligibleBranches.includes(profile.branch)) return false;
    return true;
  };

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <PageTransition>
      <DashboardLayout title="Campus Job Board">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by role, company, or keyword..."
            className="pl-9 bg-muted border-border text-sm"
          />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Briefcase size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground mb-2">No Open Positions</p>
            <p className="text-muted-foreground text-sm">Your placement cell hasn&apos;t posted any jobs yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(job => {
              const days = daysLeft(job.deadline);
              const eligible = isEligible(job);
              const matchScore = profile ? computeMatchScore(job, profile) : null;
              const matchColor = matchScore && matchScore >= 80 ? "text-green-500" : matchScore && matchScore >= 50 ? "text-primary" : "text-destructive";

              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className={`bg-card border rounded-lg p-5 hover:shadow-lg transition-all group cursor-pointer h-full ${
                    eligible ? "border-border hover:border-primary/40" : "border-destructive/20 opacity-75"
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {matchScore !== null && (
                          <div className={`flex items-center gap-1 ${matchColor}`}>
                            <Zap size={14} />
                            <span className="text-sm font-bold">{matchScore}%</span>
                          </div>
                        )}
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{job.description}</p>

                    {/* Eligibility Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      {eligible ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                          <CheckCircle2 size={10} /> Eligible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5">
                          <XCircle size={10} /> Not Eligible
                        </span>
                      )}
                      {job.minCgpa && profile?.cgpa && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          profile.cgpa >= job.minCgpa
                            ? "text-green-500 bg-green-500/10 border-green-500/20"
                            : "text-destructive bg-destructive/10 border-destructive/20"
                        }`}>
                          CGPA: {profile.cgpa} / {job.minCgpa} req
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {(job.ctcMin || job.ctcMax) && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign size={12} /> ₹{job.ctcMin ?? "—"} – {job.ctcMax ?? "—"} LPA
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${days <= 3 && days > 0 ? "text-yellow-500 font-semibold" : days <= 0 ? "text-destructive" : ""}`}>
                        <Calendar size={12} />
                        {days > 0 ? `${days}d left` : "Deadline passed"}
                      </span>
                    </div>

                    {job.eligibleBranches && job.eligibleBranches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.eligibleBranches.map(b => (
                          <span key={b} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            profile?.branch === b
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted border-border text-muted-foreground"
                          }`}>
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
