"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Brain, Target, Zap, TrendingUp, Clock, CheckCircle2, Briefcase, GraduationCap, CalendarCheck, Megaphone, BookOpen } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface User { name: string; targetRole: string | null; readinessScore: number | null }
interface MyApplication {
  id: string;
  status: string;
  appliedAt: string;
  source?: 'Internal' | 'OpenClaw';
  jobPosting: { id: string; title: string; company: string; ctcMin: number | null; ctcMax: number | null; deadline: string | null } | null;
}
interface Gap { id: string; missingSkill: string; urgency: string; weeksToLearn: number; whyImportant: string; closed: boolean }
interface Sprint { id: string; dayTasks: DayTask[]; completionPercentage: number; skillsTargeted: string[] }
interface DayTask { day: number; focus: string; topic: string; time_minutes: number }
interface Skill { id: string; skillName: string; category: string; proficiency: string }
interface Today {
  attendance: { percent: number; below: number; conducted: number } | null;
  nextClass: { title: string; start: string; date: string; room: string | null } | null;
  nextRound: { company: string; name: string; startsAt: string; confirmation: string } | null;
  unreadNotices: number | null;
}

const statusColors: Record<string, string> = {
  Applied: 'bg-blue-500/10 text-blue-400',
  Shortlisted: 'bg-amber-500/10 text-amber-400',
  OA: 'bg-purple-500/10 text-purple-400',
  Interview: 'bg-primary/10 text-primary',
  Offered: 'bg-emerald-500/10 text-emerald-400',
  Placed: 'bg-green-500/10 text-green-400',
  Rejected: 'bg-destructive/10 text-destructive',
};

// OpenClaw prepares applications the student submits themselves; its statuses read differently
const OPENCLAW_STATUS: Record<string, string> = { Pending: 'Preparing', ReadyToApply: 'Ready to apply', Duplicate: 'Duplicate', Failed: 'Needs attention' };

const CATEGORY_LABEL: Record<string, string> = { technical: 'Languages & core', framework: 'Frameworks', tool: 'Tools', soft: 'Soft skills' };
const when = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const shortDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

/** GET a JSON endpoint; any failure resolves to null so one broken widget never blocks the page. */
const getJson = <T,>(url: string): Promise<T | null> =>
  fetch(url).then(r => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null);

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [today, setToday] = useState<Today>({ attendance: null, nextClass: null, nextRound: null, unreadNotices: null });
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadStep, setUploadStep] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setUploadError(''); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setUploadError('Please upload a PDF under 5 MB')
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setUploadError(''); setUploadStep(1);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); setUploadStep(0); return; }
      setUploadStep(2);
      const gapRes = await fetch('/api/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: user?.targetRole || 'Software Engineer' }),
      });
      if (!gapRes.ok) {
        // The résumé is saved; gap analysis can be rerun from the Skill Gap page
        const gapData = await gapRes.json().catch(() => ({}));
        setUploadError(`Résumé saved, but gap analysis failed: ${gapData.error ?? 'please retry from Skill Gap.'}`);
      }
      setUploadStep(3);
      window.location.reload();
    } catch { setUploadError('Upload failed. Please try again.'); setUploadStep(0); }
    finally { setUploading(false); }
  };

  useEffect(() => {
    type Me = { user: User }
    Promise.all([
      getJson<Me>('/api/users/me'),
      getJson<{ gaps: Gap[] }>('/api/gaps'),
      getJson<{ sprint: Sprint | null }>('/api/sprints'),
      getJson<{ skills: Skill[] }>('/api/skills'),
      getJson<{ applications: MyApplication[] }>('/api/jobs/applications'),
    ]).then(([u, g, s, sk, appData]) => {
      setUser(u?.user ?? null);
      setGaps(g?.gaps ?? []);
      setSprint(s?.sprint ?? null);
      setSkills(sk?.skills ?? []);
      setMyApplications(appData?.applications ?? []);
      setLoading(false);
    });

    // Secondary widgets load independently
    type Academics = {
      overall: { percent: number; below: number; conducted: number };
      nextClass: { date: string; entry: { title: string; start: string; room: string | null } } | null;
    }
    type Participation = { rounds: { job: { company: string }; round: { name: string; startsAt: string | null }; confirmation: string; past: boolean }[] }
    Promise.all([
      getJson<Academics>('/api/academics'),
      getJson<Participation>('/api/participation'),
      getJson<{ unread: number; joinedCollege: boolean }>('/api/notices'),
    ]).then(([academics, participation, notices]) => {
      const upcoming = (participation?.rounds ?? [])
        .filter(r => !r.past && r.round.startsAt && new Date(r.round.startsAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.round.startsAt!).getTime() - new Date(b.round.startsAt!).getTime())[0];
      setToday({
        attendance: academics && academics.overall.conducted > 0 ? academics.overall : null,
        nextClass: academics?.nextClass
          ? { title: academics.nextClass.entry.title, start: academics.nextClass.entry.start, date: academics.nextClass.date, room: academics.nextClass.entry.room }
          : null,
        nextRound: upcoming ? { company: upcoming.job.company, name: upcoming.round.name, startsAt: upcoming.round.startsAt!, confirmation: upcoming.confirmation } : null,
        unreadNotices: notices?.joinedCollege ? notices.unread : null,
      });
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const activeGaps = gaps.filter(g => !g.closed);
  const readiness = Math.round(user?.readinessScore ?? 0);
  const skillsByCategory = skills.reduce<Record<string, string[]>>((acc, s) => {
    const key = s.category || 'technical';
    (acc[key] ??= []).push(s.skillName);
    return acc;
  }, {});
  const hasToday = Boolean(today.attendance || today.nextClass || today.nextRound || today.unreadNotices);

  return (
    <PageTransition>
      <DashboardLayout title="Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Brain size={20} />} label="Skills mapped from your résumé" value={skills.length.toString()} />
          <StatCard icon={<Target size={20} />} label="Open skill gaps" value={activeGaps.length.toString()} trend={gaps.length ? `${gaps.length - activeGaps.length} closed` : undefined} trendUp />
          <StatCard icon={<Zap size={20} />} label="Sprint completion" value={sprint ? `${Math.round(sprint.completionPercentage)}%` : "0%"} trend={sprint ? "Active" : "No sprint"} trendUp={!!sprint} />
          <StatCard icon={<TrendingUp size={20} />} label={`Readiness for ${user?.targetRole || 'your target role'}`} value={skills.length ? `${readiness}%` : '—'} />
        </div>

        {hasToday && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {today.attendance && (
              <TodayCard href="/academics" icon={<GraduationCap size={16} />} label="Attendance"
                value={`${today.attendance.percent.toFixed(1)}%`}
                detail={today.attendance.below ? `${today.attendance.below} course${today.attendance.below === 1 ? '' : 's'} below 75%` : 'All courses at 75% or above'}
                warn={today.attendance.below > 0} />
            )}
            {today.nextClass && (
              <TodayCard href="/academics" icon={<BookOpen size={16} />} label="Next class"
                value={today.nextClass.title}
                detail={`${today.nextClass.start}${today.nextClass.room ? ` · ${today.nextClass.room}` : ''}`} />
            )}
            {today.nextRound && (
              <TodayCard href="/participation" icon={<CalendarCheck size={16} />} label="Next round"
                value={`${today.nextRound.company}: ${today.nextRound.name}`}
                detail={`${when.format(new Date(today.nextRound.startsAt))}${today.nextRound.confirmation === 'pending' ? ' · confirm attendance' : ''}`}
                warn={today.nextRound.confirmation === 'pending'} />
            )}
            {today.unreadNotices !== null && (
              <TodayCard href="/notices" icon={<Megaphone size={16} />} label="Notices"
                value={today.unreadNotices ? `${today.unreadNotices} unread` : 'All caught up'}
                detail="From your placement cell" warn={today.unreadNotices > 0} />
            )}
          </div>
        )}

        {skills.length === 0 ? (
          <div className="bg-card border border-border flex flex-col items-center justify-center rounded-lg p-10 text-center max-w-2xl mx-auto mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
            <Brain size={44} className="text-primary mb-5" />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3">Upload your résumé</h2>
            <p className="text-muted-foreground mb-8">SkillGraph reads your skills from it, compares them with what employers ask for, and builds your learning plan.</p>

            {uploadStep === 0 && (
              <div className="w-full max-w-sm">
                <div {...getRootProps()} className={`w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}>
                  <input {...getInputProps()} />
                  {file ? <span className="text-success font-medium">{file.name}</span> : <span className="text-muted-foreground text-sm font-medium">Drop a PDF here, or click to choose</span>}
                </div>
                {uploadError && <div className="text-destructive text-xs mt-3 bg-destructive/10 p-2 rounded" role="alert">{uploadError}</div>}
                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-6 gradient-primary text-primary-foreground font-semibold glow-primary">
                  Upload résumé
                </Button>
              </div>
            )}

            {uploadStep > 0 && uploadStep < 3 && (
              <div className="flex flex-col items-center justify-center p-8" role="status">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-semibold text-primary">
                  {uploadStep === 1 ? 'Reading your résumé…' : 'Finding your skill gaps…'}
                </p>
              </div>
            )}

            {uploadStep === 3 && (
              <p className="p-8 text-success font-semibold text-sm" role="status">Done. Loading your dashboard…</p>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Skills */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Brain size={18} className="text-primary" /> Your skills
              </h2>
              <div className="space-y-4">
                {Object.entries(skillsByCategory).map(([category, names]) => (
                  <div key={category}>
                    <p className="text-xs text-muted-foreground mb-1.5">{CATEGORY_LABEL[category] ?? category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {names.slice(0, 12).map(n => (
                        <span key={n} className="text-xs px-2 py-1 rounded-md bg-muted border border-border text-foreground">{n}</span>
                      ))}
                      {names.length > 12 && <span className="text-xs text-muted-foreground px-1 py-1">+{names.length - 12}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary" /> Skill gaps
              </h2>
              {activeGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No open gaps. <Link href="/market" className="text-primary hover:underline">Run a gap analysis</Link> for another role.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeGaps.slice(0, 5).map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm font-medium text-foreground">{g.missingSkill}</p>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                        g.urgency === "high" ? "bg-destructive/10 text-destructive" :
                        g.urgency === "medium" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      }`}>{g.urgency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sprint */}
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <Zap size={18} className="text-primary" /> This week&apos;s sprint
              </h2>
              {!sprint ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
                  <Zap size={32} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No sprint yet. Turn your skill gaps into a 7-day plan.</p>
                  <Button onClick={() => router.push('/sprint')} variant="outline" className="text-xs bg-muted/50">
                    Create a sprint
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <Clock size={12} /> {Math.round(sprint.completionPercentage)}% complete
                  </p>
                  <div className="space-y-3">
                    {sprint.dayTasks.slice(0, 5).map((t, i) => {
                      const done = (i * 100 / sprint.dayTasks.length) < sprint.completionPercentage;
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          done ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"
                        }`}>
                          <CheckCircle2 size={18} className={done ? "text-success mt-0.5 min-w-[18px]" : "text-muted-foreground mt-0.5 min-w-[18px]"} />
                          <span className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"} line-clamp-2`}>
                            Day {t.day}: {t.topic}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Applications are shown whether or not a résumé has been uploaded */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase size={18} className="text-primary" /> My applications
            </h2>
            {myApplications.length > 0 && <Link href="/tracker" className="text-xs text-primary hover:underline">Open job tracker</Link>}
          </div>
          {myApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No applications yet. Browse the <Link href="/jobs" className="text-primary hover:underline">campus job board</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {myApplications.slice(0, 6).map((a) => (
                <Link key={a.id} href={a.source === 'OpenClaw' ? '/openclaw' : a.jobPosting ? `/jobs/${a.jobPosting.id}` : '/tracker'}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.jobPosting?.title ?? 'Job'}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.jobPosting?.company} · {a.source === 'OpenClaw' ? 'OpenClaw' : 'Applied'} {shortDate.format(new Date(a.appliedAt))}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {a.source === 'OpenClaw' ? OPENCLAW_STATUS[a.status] ?? a.status : a.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}

function TodayCard({ href, icon, label, value, detail, warn }: { href: string; icon: React.ReactNode; label: string; value: string; detail: string; warn?: boolean }) {
  return (
    <Link href={href} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</p>
      <p className={`font-heading font-semibold mt-1.5 truncate ${warn ? 'text-amber-400' : 'text-foreground'}`} title={value}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>
    </Link>
  );
}
