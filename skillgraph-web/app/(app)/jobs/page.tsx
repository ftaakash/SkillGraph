"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase, Calendar, IndianRupee, ChevronRight, CheckCircle2, XCircle, Zap, Search, MapPin, Clock, ExternalLink, Check,
} from "lucide-react";
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
  stipendMin: number | null;
  stipendMax: number | null;
  jobType: string | null;
  location: string | null;
  duration: string | null;
  visitMode: string | null;
  source: string;
  applyUrl: string | null;
  externalRef: string | null;
  minCgpa: number | null;
  eligibleBranches: string[];
  deadline: string;
  driveDate: string | null;
  applicationCount: number;
  isOpen: boolean;
  isNew: boolean;
  closingSoon: boolean;
  application: { status: string; channel: string } | null;
}

interface UserProfile {
  cgpa: number | null;
  branch: string | null;
  skills: { skillName: string }[];
  targetRole: string | null;
}

type View = "eligible" | "applied" | "not_applied" | "rejected" | "offered" | "all";
const VIEWS: [View, string][] = [
  ["eligible", "Eligible"],
  ["applied", "Applied"],
  ["not_applied", "Eligible, not applied"],
  ["rejected", "Rejected"],
  ["offered", "Offers"],
  ["all", "All"],
];
const OFFER_STATUSES = new Set(["Offered", "Placed"]);

const VISIT_MODE_LABEL: Record<string, string> = { physical: "In person", virtual: "Virtual", both: "In person or virtual", undecided: "Not decided" };

const istDateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const istDay = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

const lpa = (min: number | null, max: number | null) =>
  min && max && min !== max ? `${min}–${max} LPA` : min || max ? `${min || max} LPA` : null;
const thousands = (n: number) => `${Math.round(n / 1000)}K`;
const stipend = (min: number | null, max: number | null) =>
  min && max && min !== max ? `${thousands(min)}–${thousands(max)}/mo` : min || max ? `${thousands((min || max)!)}/mo` : null;

function timeLeft(deadline: string, now: number) {
  const ms = new Date(deadline).getTime() - now;
  if (ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  return hours < 24 ? `${hours}h ${Math.floor((ms % 3_600_000) / 60_000)}m left` : `${Math.floor(hours / 24)}d left`;
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
  const [stats, setStats] = useState({ total: 0, open: 0, closingSoon: 0 });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("eligible");
  const [showPrevious, setShowPrevious] = useState(false);
  const [jobType, setJobType] = useState("");
  const [sortDesc, setSortDesc] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [joinedCollege, setJoinedCollege] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadJobs = useCallback(() =>
    fetch("/api/jobs").then(r => r.json()).then(data => {
      setJobs(data.jobs ?? []);
      setStats(data.stats ?? { total: 0, open: 0, closingSoon: 0 });
      setJoinedCollege(data.joinedCollege !== false);
      setNow(Date.now());
    }), []);

  useEffect(() => {
    Promise.all([
      loadJobs(),
      fetch("/api/users/me").then(r => r.json()).catch(() => null),
    ]).then(([, profileData]) => {
      const me = profileData?.user;
      if (me) {
        setProfile({
          cgpa: me.cgpa ?? null,
          branch: me.branch ?? null,
          skills: me.skills ?? [],
          targetRole: me.targetRole ?? null,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [loadJobs]);

  const toggleApplied = async (job: Job) => {
    setBusy(job.id);
    try {
      const marked = job.application?.channel === "external";
      await fetch(
        marked ? `/api/jobs/mark-applied?jobPostingId=${encodeURIComponent(job.id)}` : "/api/jobs/mark-applied",
        marked
          ? { method: "DELETE" }
          : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobPostingId: job.id }) },
      );
      await loadJobs().catch(() => {});
    } finally {
      setBusy(null);
    }
  };

  const isEligible = useCallback((job: Job) => {
    if (!profile) return true;
    if (job.minCgpa && profile.cgpa && profile.cgpa < job.minCgpa) return false;
    if (job.eligibleBranches?.length > 0 && profile.branch && !job.eligibleBranches.includes(profile.branch)) return false;
    return true;
  }, [profile]);

  const jobTypes = useMemo(() => [...new Set(jobs.map(j => j.jobType).filter((t): t is string => Boolean(t)))].sort(), [jobs]);

  const inView = useCallback((j: Job) => {
    const status = j.application?.status;
    switch (view) {
      case "eligible": return isEligible(j);
      case "applied": return Boolean(j.application);
      case "not_applied": return isEligible(j) && !j.application;
      case "rejected": return status === "Rejected";
      case "offered": return Boolean(status && OFFER_STATUSES.has(status));
      default: return true;
    }
  }, [view, isEligible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // Applications, rejections and offers are history: show them whether or not the drive is still open
    const historyView = view === "applied" || view === "rejected" || view === "offered";
    return jobs
      .filter(j =>
        (showPrevious || historyView || j.isOpen) &&
        inView(j) &&
        (!jobType || j.jobType === jobType) &&
        (!q ||
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          (j.location ?? "").toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q))
      )
      .sort((a, b) => (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * (sortDesc ? -1 : 1));
  }, [jobs, search, view, showPrevious, jobType, sortDesc, inView]);

  return (
    <PageTransition>
      <DashboardLayout title="Campus Job Board">
        {joinedCollege && !loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Drives this term", value: stats.total, tone: "text-foreground" },
              { label: "Open now", value: stats.open, tone: "text-emerald-400" },
              { label: "Closing in 24h", value: stats.closingSoon, tone: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-lg p-4">
                <p className={`text-2xl font-heading font-bold ${s.tone}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by role, company, location or keyword..."
              className="pl-9 bg-muted border-border text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSortDesc(d => !d)}
              className="text-sm px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              Apply by {sortDesc ? "(latest first)" : "(soonest first)"}
            </button>
            {jobTypes.length > 0 && (
              <select
                aria-label="Job type"
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-border bg-muted text-foreground"
              >
                <option value="">All job types</option>
                {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <input type="checkbox" checked={showPrevious} onChange={e => setShowPrevious(e.target.checked)} />
              Previous drives
            </label>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter drives">
          {VIEWS.map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${view === v ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Briefcase size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground mb-2">
              {view === "applied" ? "No applications yet" : view === "offered" ? "No offers yet" : view === "rejected" ? "Nothing here" : "No drives to show"}
            </p>
            <p className="text-muted-foreground text-sm">
              {!joinedCollege
                ? <>Join your college workspace with the code from your placement cell on your <Link href="/profile" className="text-primary hover:underline">Profile</Link> to see campus jobs.</>
                : view === "applied"
                  ? <>Drives you apply to here, or mark as applied on your placement portal, show up in this list.</>
                  : <>Your placement cell hasn&apos;t posted any open drives. Check back soon.</>}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(job => {
              const left = now !== null ? timeLeft(job.deadline, now) : null;
              const eligible = isEligible(job);
              const matchScore = profile && job.isOpen ? computeMatchScore(job, profile) : null;
              const matchColor = matchScore && matchScore >= 80 ? "text-green-500" : matchScore && matchScore >= 50 ? "text-primary" : "text-destructive";
              const ctc = lpa(job.ctcMin, job.ctcMax);
              const pay = stipend(job.stipendMin, job.stipendMax);

              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className={`bg-card border rounded-lg p-5 hover:shadow-lg transition-all group cursor-pointer h-full flex flex-col ${
                    !job.isOpen ? "border-border opacity-70" : eligible ? "border-border hover:border-primary/40" : "border-destructive/20 opacity-75"
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {job.isOpen ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Open</span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">Closed</span>
                          )}
                          {job.isNew && <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">New</span>}
                          {job.closingSoon && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Closing soon</span>}
                        </div>
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

                    {(ctc || pay) && (
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
                        {ctc && <span className="flex items-center gap-1 text-lg font-heading font-bold text-primary"><IndianRupee size={14} />{ctc}</span>}
                        {pay && <span className="text-sm text-foreground">{pay} <span className="text-muted-foreground text-xs">stipend</span></span>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      {job.jobType && <Detail label="Type" value={job.jobType} />}
                      {job.duration && <Detail label="Duration" value={job.duration} />}
                      {job.driveDate && (
                        <Detail
                          label="Visit"
                          value={`${istDay.format(new Date(job.driveDate))}${job.visitMode ? ` · ${VISIT_MODE_LABEL[job.visitMode] ?? job.visitMode}` : ""}`}
                        />
                      )}
                      {job.location && <Detail label="Location" value={job.location} icon={<MapPin size={10} />} />}
                    </div>

                    {/* Eligibility Badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
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
                      {job.eligibleBranches?.map(b => (
                        <span key={b} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          profile?.branch === b ? "bg-primary/10 text-primary border-primary/20" : "bg-muted border-border text-muted-foreground"
                        }`}>
                          {b}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <span className={`flex items-center gap-1 text-xs ${job.closingSoon ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                        {job.isOpen ? <Clock size={12} /> : <Calendar size={12} />}
                        {job.isOpen ? `Apply by ${istDateTime.format(new Date(job.deadline))}${left ? ` · ${left}` : ""}` : `Closed ${istDay.format(new Date(job.deadline))}`}
                      </span>
                      <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                        {job.applyUrl && job.isOpen && (
                          // A button, not a link: the card itself is already a link
                          <button
                            type="button"
                            onClick={() => window.open(job.applyUrl!, "_blank", "noopener,noreferrer")}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Apply on portal <ExternalLink size={11} />
                          </button>
                        )}
                        {job.application?.channel === "skillgraph" ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={12} /> {job.application.status}</span>
                        ) : !job.application && !(job.applyUrl || job.externalRef) ? (
                          // Drives run on SkillGraph are applied to from the job page, not self-marked
                          job.isOpen && <span className="text-xs text-primary">Apply →</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === job.id}
                            onClick={() => toggleApplied(job)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 ${
                              job.application
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                            }`}
                            aria-pressed={Boolean(job.application)}
                          >
                            <Check size={12} /> {job.application ? "Applied" : "Mark applied"}
                          </button>
                        )}
                      </div>
                    </div>
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

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted/50 border border-border/60 rounded-md px-2.5 py-1.5 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground truncate flex items-center gap-1">{icon}{value}</p>
    </div>
  );
}
