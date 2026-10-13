"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Send, CheckCircle2, Users, IndianRupee, Wallet, Clock, CalendarDays, MapPin, Tag, Briefcase, Building2, GraduationCap,
  MessageSquare, Megaphone, ExternalLink,
} from "lucide-react";
import RoundTimeline, { type TimelineRound } from "@/components/placement/RoundTimeline";

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
  category: string | null;
  batchYear: number | null;
  minCgpa: number | null;
  eligibleBranches: string[] | null;
  deadline: string;
  driveDate: string | null;
  applyUrl: string | null;
  applicationCount: number;
  isOpen: boolean;
  application: { id: string; status: string; channel: string; appliedAt: string } | null;
}

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const istDateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit", hour12: true });
const istDay = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "2-digit" });
const VISIT_MODE: Record<string, string> = { physical: "In person", virtual: "Virtual", both: "In person or virtual", undecided: "Mode not decided" };
const SOURCE: Record<string, string> = { on_campus: "On campus", off_campus: "Off campus", pool: "Pool campus" };

const range = (min: number | null, max: number | null, fmt: (n: number) => string) =>
  min && max && min !== max ? `${fmt(min)} – ${fmt(max)}` : min || max ? fmt((min || max)!) : null;

function relativeDeadline(deadline: string, now: number) {
  const ms = new Date(deadline).getTime() - now;
  if (ms < 0) return "Closed";
  const days = Math.floor(ms / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [rounds, setRounds] = useState<TimelineRound[]>([]);
  const [noticeCount, setNoticeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const load = useCallback(() =>
    fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setJob(d?.job ?? null);
        setRounds(d?.rounds ?? []);
        setNoticeCount(d?.noticeCount ?? 0);
        setNow(Date.now());
        setLoading(false);
      })
      .catch(() => setLoading(false)), [jobId]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: jobId, coverLetter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to apply");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setApplying(false);
    }
  };

  const applied = Boolean(job?.application);
  const ctc = job ? range(job.ctcMin, job.ctcMax, n => `₹${n}L`) : null;
  const stipend = job ? range(job.stipendMin, job.stipendMax, n => rupees.format(n)) : null;

  return (
    <PageTransition>
      <DashboardLayout title="Job Details">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to jobs
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !job ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Job not found.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Building2 size={14} /> {job.company}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${job.isOpen ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>
                    {job.isOpen ? "Open for applications" : "Closed for applications"}
                  </span>
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">{job.title}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-6">
                  {job.location && <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>}
                  {job.category && <span className="flex items-center gap-1"><Tag size={12} /> {job.category}</span>}
                  {job.jobType && <span className="flex items-center gap-1"><Briefcase size={12} /> {job.jobType}</span>}
                  <span className="flex items-center gap-1"><Building2 size={12} /> {SOURCE[job.source] ?? job.source}</span>
                  {job.batchYear && <span className="flex items-center gap-1"><GraduationCap size={12} /> Batch {job.batchYear}</span>}
                  {job.duration && <span className="flex items-center gap-1"><Clock size={12} /> {job.duration}</span>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
                  <Stat icon={<Users size={16} />} value={job.applicationCount.toLocaleString("en-IN")} label="Applicants" />
                  {ctc && <Stat icon={<IndianRupee size={16} />} value={ctc} label="CTC per year" />}
                  {stipend && <Stat icon={<Wallet size={16} />} value={stipend} label="Stipend per month" />}
                  <Stat
                    icon={<Clock size={16} />}
                    value={now ? relativeDeadline(job.deadline, now) : "—"}
                    label={`Apply by ${istDateTime.format(new Date(job.deadline))}`}
                  />
                  {job.driveDate && (
                    <Stat
                      icon={<CalendarDays size={16} />}
                      value={istDay.format(new Date(job.driveDate))}
                      label={job.visitMode ? VISIT_MODE[job.visitMode] ?? job.visitMode : "Date of visit"}
                    />
                  )}
                </div>

                {((job.eligibleBranches?.length ?? 0) > 0 || job.minCgpa) && (
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-2">Eligibility</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.minCgpa && <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border">CGPA ≥ {job.minCgpa}</span>}
                      {job.eligibleBranches?.map(b => (
                        <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-6">
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Job Description</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{job.description}</div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-base font-semibold text-foreground">Hiring process</h3>
                  {noticeCount > 0 && (
                    <Link href={`/notices?job=${job.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Megaphone size={12} /> {noticeCount} notice{noticeCount === 1 ? "" : "s"}
                    </Link>
                  )}
                </div>
                {rounds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">The placement cell hasn&apos;t published the rounds for this drive yet.</p>
                ) : (
                  <RoundTimeline rounds={rounds} showProgress={applied} />
                )}
              </div>
            </div>

            <div>
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24 space-y-4">
                {applied ? (
                  <div className="text-center py-2">
                    <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
                    <p className="font-heading font-semibold text-foreground mb-1">
                      {job.application!.channel === "external" ? "Marked as applied" : "Application submitted"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="text-foreground">{job.application!.status}</span>. Follow every round in your{" "}
                      <Link href="/tracker" className="text-primary hover:underline">job tracker</Link>.
                    </p>
                  </div>
                ) : !job.isOpen ? (
                  <div className="text-center py-2">
                    <p className="font-heading font-semibold text-foreground mb-1">Applications closed</p>
                    <p className="text-sm text-muted-foreground">The deadline for this drive has passed.</p>
                  </div>
                ) : job.applyUrl ? (
                  <div className="text-center py-2">
                    <p className="font-heading font-semibold text-foreground mb-2">Apply on your placement portal</p>
                    <p className="text-sm text-muted-foreground mb-4">This drive is run on another portal. Apply there, then mark it applied on the job board to track it.</p>
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      Open the portal <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <>
                    <h3 className="font-heading text-base font-semibold text-foreground">Apply to this position</h3>
                    <div>
                      <label htmlFor="cover" className="block text-xs font-medium text-muted-foreground mb-1.5">Cover letter (optional)</label>
                      <textarea
                        id="cover"
                        rows={5}
                        value={coverLetter}
                        onChange={e => setCoverLetter(e.target.value)}
                        placeholder="Why are you a good fit for this role?"
                        className="w-full rounded-md bg-muted border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
                    <Button onClick={handleApply} disabled={applying} className="w-full gradient-primary text-primary-foreground font-semibold glow-primary">
                      {applying ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      ) : (
                        <Send className="mr-2" size={16} />
                      )}
                      Submit Application
                    </Button>
                  </>
                )}
                {applied && (
                  <Link
                    href={`/chat?job=${job.id}`}
                    className="flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md border border-border hover:border-primary/40"
                  >
                    <MessageSquare size={14} /> Drive chat
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <div className="text-primary mb-2">{icon}</div>
      <p className="font-heading font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{label}</p>
    </div>
  );
}
