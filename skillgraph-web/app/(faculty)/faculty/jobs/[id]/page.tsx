"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, QrCode, MessageSquare, Megaphone, Pencil, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";

type Round = {
  id: string;
  position: number;
  name: string;
  kind: string;
  startsAt: string | null;
  endsAt: string | null;
  mode: string | null;
  venue: string | null;
  attendanceCode: string | null;
  attendanceUntil: string | null;
};
type Cell = { state: string; confirmation: string; attended: boolean };
type Applicant = {
  applicationId: string;
  status: string;
  channel: string;
  appliedAt: string;
  student: { id: string; name: string; email: string; branch: string | null; cgpa: number | null; regNo: string | null };
  eliminated: boolean;
  currentRoundId: string | null;
  results: Record<string, Cell>;
};
type Job = { id: string; title: string; company: string; category: string | null; batchYear: number | null; deadline: string; driveDate: string | null };

const KINDS: [string, string][] = [
  ["screening", "Application screening"], ["ppt", "Pre-placement talk"], ["test", "Test"], ["gd", "Group discussion"],
  ["technical", "Technical interview"], ["hr", "HR interview"], ["other", "Other"],
];
const STATUSES = ["Applied", "Shortlisted", "OA", "Interview", "Offered", "Placed", "Rejected"];
const CELL_TONE: Record<string, string> = {
  cleared: "text-emerald-400 border-emerald-500/30",
  rejected: "text-red-400 border-red-500/30",
  absent: "text-red-400 border-red-500/30",
  pending: "text-amber-400 border-amber-500/30",
  upcoming: "text-muted-foreground border-border",
  not_reached: "text-muted-foreground/50 border-border/50",
};
const CELL_LABEL: Record<string, string> = { cleared: "Cleared", rejected: "Rejected", absent: "Absent", pending: "Pending", upcoming: "Upcoming", not_reached: "—" };
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** ISO → value for <input type="datetime-local"> in the browser's time zone */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export default function FacultyDrivePage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Round | "new" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetRound, setTargetRound] = useState<string>("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(() =>
    fetch(`/api/faculty/jobs/${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setJob(d.job);
        setRounds(d.rounds);
        setApplicants(d.applicants);
        setTargetRound(t => t || d.rounds[0]?.id || "");
        setNow(Date.now());
        setLoaded(true);
      })
      .catch(() => {
        setError("Drive not found.");
        setLoaded(true);
      }), [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const shown = useMemo(() => applicants.filter(a => !onlyActive || !a.eliminated), [applicants, onlyActive]);
  const allSelected = shown.length > 0 && shown.every(a => selected.has(a.applicationId));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(shown.map(a => a.applicationId)));
  const toggle = (appId: string) =>
    setSelected(s => {
      const next = new Set(s);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });

  const bulk = (payload: { outcome?: string; attended?: boolean }) =>
    run(async () => {
      if (!targetRound || selected.size === 0) throw new Error("Choose a round and select applicants first");
      await send(`/api/faculty/rounds/${targetRound}/results`, "POST", { applicationIds: [...selected], ...payload });
      setSelected(new Set());
    });

  const counts = useMemo(() => {
    const active = applicants.filter(a => !a.eliminated).length;
    const offers = applicants.filter(a => a.status === "Offered" || a.status === "Placed").length;
    return { total: applicants.length, active, offers };
  }, [applicants]);

  return (
    <PageTransition>
      <DashboardLayout title="Manage Drive">
        <Link href="/faculty/jobs" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"><ArrowLeft size={14} /> Job postings</Link>

        {!loaded ? (
          <div className="flex h-64 items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : !job ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <h2 className="font-heading text-xl font-semibold text-foreground">{job.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {counts.total} applicants · {counts.active} still in process · {counts.offers} offers
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <DriveDetails job={job} onSave={patch => run(() => send(`/api/faculty/jobs/${job.id}`, "PATCH", patch))} />
                <Link href={`/notices?job=${job.id}`} className="flex items-center gap-1 text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40"><Megaphone size={12} /> Notices</Link>
                <Link href={`/chat?job=${job.id}`} className="flex items-center gap-1 text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40"><MessageSquare size={12} /> Drive chat</Link>
              </div>
            </div>

            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

            <section className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-foreground">Hiring process</h3>
                <button onClick={() => setEditing("new")} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                  <Plus size={14} /> Add round
                </button>
              </div>
              {editing && (
                <RoundForm
                  round={editing === "new" ? null : editing}
                  onCancel={() => setEditing(null)}
                  onSave={data =>
                    run(async () => {
                      if (editing === "new") await send(`/api/faculty/jobs/${job.id}/rounds`, "POST", data);
                      else await send(`/api/faculty/rounds/${editing.id}`, "PATCH", { action: "update", round: data });
                      setEditing(null);
                    })
                  }
                />
              )}
              {rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rounds yet. Add the stages of this drive so students can confirm, check in and follow their progress.</p>
              ) : (
                <ol className="space-y-2">
                  {rounds.map(r => {
                    const open = Boolean(r.attendanceCode && r.attendanceUntil && now && new Date(r.attendanceUntil).getTime() > now);
                    return (
                      <li key={r.id} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-3">
                        <span className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{r.position}</span>
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-medium text-foreground">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[r.startsAt ? when.format(new Date(r.startsAt)) : "Time not set", r.mode === "virtual" ? "Virtual" : r.mode === "physical" ? "In person" : null, r.venue]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {open ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg tracking-[0.3em] text-primary bg-primary/10 border border-primary/30 rounded-md px-3 py-1" aria-label="Check-in code">
                              {r.attendanceCode}
                            </span>
                            <span className="text-[11px] text-muted-foreground">until {when.format(new Date(r.attendanceUntil!))}</span>
                            <button onClick={() => run(() => send(`/api/faculty/rounds/${r.id}`, "PATCH", { action: "close_attendance" }))} className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-red-500/40">
                              Close check-in
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => run(() => send(`/api/faculty/rounds/${r.id}`, "PATCH", { action: "open_attendance", minutes: 60 }))}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-primary/40"
                          >
                            <QrCode size={12} /> Open check-in (60 min)
                          </button>
                        )}
                        <button onClick={() => setEditing(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground" aria-label={`Edit ${r.name}`}><Pencil size={14} /></button>
                        <button
                          onClick={() => window.confirm(`Delete "${r.name}" and its results?`) && run(() => send(`/api/faculty/rounds/${r.id}`, "DELETE"))}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400"
                          aria-label={`Delete ${r.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
              {rounds.some(r => r.attendanceCode) && (
                <p className="text-xs text-muted-foreground mt-3">Show the code at the venue or on screen. Students in the round enter it on their Participation page.</p>
              )}
            </section>

            <section className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-heading font-semibold text-foreground">Applicants</h3>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} /> Only students still in process
                </label>
              </div>
              {rounds.length > 0 && (
                <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{selected.size} selected · for</span>
                  <label htmlFor="target-round" className="sr-only">Round</label>
                  <select id="target-round" value={targetRound} onChange={e => setTargetRound(e.target.value)} className="rounded-md bg-muted border border-border text-sm px-2 py-1.5">
                    {rounds.map(r => <option key={r.id} value={r.id}>Round {r.position}: {r.name}</option>)}
                  </select>
                  <button onClick={() => bulk({ outcome: "cleared" })} className="text-xs px-2.5 py-1.5 rounded-md border border-emerald-500/30 text-emerald-400">Cleared</button>
                  <button onClick={() => bulk({ outcome: "rejected" })} className="text-xs px-2.5 py-1.5 rounded-md border border-red-500/30 text-red-400">Rejected</button>
                  <button onClick={() => bulk({ outcome: "absent" })} className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground">Absent</button>
                  <button onClick={() => bulk({ attended: true })} className="text-xs px-2.5 py-1.5 rounded-md border border-sky-500/30 text-sky-400">Mark attended</button>
                  <button onClick={() => bulk({ outcome: "pending" })} className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground">Reset</button>
                </div>
              )}
              {applicants.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No applicants yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all applicants" /></th>
                        <th className="px-4 py-2 font-medium">Student</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        {rounds.map(r => <th key={r.id} className="px-3 py-2 font-medium whitespace-nowrap">R{r.position}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map(a => (
                        <tr key={a.applicationId} className="border-t border-border/60">
                          <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(a.applicationId)} onChange={() => toggle(a.applicationId)} aria-label={`Select ${a.student.name}`} /></td>
                          <td className="px-4 py-2.5">
                            <p className="text-foreground">{a.student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[a.student.regNo, a.student.branch, a.student.cgpa ? `CGPA ${a.student.cgpa}` : null, a.channel === "external" ? "applied on portal" : null].filter(Boolean).join(" · ")}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <label htmlFor={`status-${a.applicationId}`} className="sr-only">Application status</label>
                            <select
                              id={`status-${a.applicationId}`}
                              value={a.status}
                              onChange={e => run(() => send("/api/faculty/applications", "PATCH", { applicationId: a.applicationId, status: e.target.value }))}
                              className="rounded-md bg-muted border border-border text-xs px-2 py-1"
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          {rounds.map(r => {
                            const cell = a.results[r.id];
                            return (
                              <td key={r.id} className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CELL_TONE[cell?.state ?? "upcoming"]}`}>{CELL_LABEL[cell?.state ?? "upcoming"]}</span>
                                {cell?.attended && <span className="ml-1 text-[10px] text-sky-400" title="Attended">●</span>}
                                {cell?.confirmation === "declined" && <span className="ml-1 text-[10px] text-muted-foreground" title="Declined">✕</span>}
                                {cell?.confirmation === "confirmed" && !cell.attended && <span className="ml-1 text-[10px] text-emerald-400" title="Confirmed">✓</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/60">✓ confirmed · ✕ declined · <span className="text-sky-400">●</span> attended</p>
                </div>
              )}
            </section>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}

function RoundForm({ round, onSave, onCancel }: { round: Round | null; onSave: (data: Record<string, unknown>) => void; onCancel: () => void }) {
  const [name, setName] = useState(round?.name ?? "");
  const [kind, setKind] = useState(round?.kind ?? "test");
  const [startsAt, setStartsAt] = useState(toLocalInput(round?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(round?.endsAt ?? null));
  const [mode, setMode] = useState(round?.mode ?? "");
  const [venue, setVenue] = useState(round?.venue ?? "");

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({ name, kind, startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt), mode: mode || null, venue: venue || null });
      }}
      className="border border-primary/30 rounded-lg p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{round ? `Edit round ${round.position}` : "New round"}</p>
        <button type="button" onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Cancel"><X size={14} /></button>
      </div>
      <Field label="Name" id="r-name"><input id="r-name" value={name} onChange={e => setName(e.target.value)} required maxLength={120} className="w-full rounded-md bg-muted border border-border text-sm p-2" /></Field>
      <Field label="Type" id="r-kind">
        <select id="r-kind" value={kind} onChange={e => { setKind(e.target.value); if (!name) setName(KINDS.find(k => k[0] === e.target.value)?.[1] ?? ""); }} className="w-full rounded-md bg-muted border border-border text-sm p-2">
          {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </Field>
      <Field label="Mode" id="r-mode">
        <select id="r-mode" value={mode} onChange={e => setMode(e.target.value)} className="w-full rounded-md bg-muted border border-border text-sm p-2">
          <option value="">Not decided</option>
          <option value="physical">In person</option>
          <option value="virtual">Virtual</option>
        </select>
      </Field>
      <Field label="Starts" id="r-start"><input id="r-start" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full rounded-md bg-muted border border-border text-sm p-2" /></Field>
      <Field label="Ends" id="r-end"><input id="r-end" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full rounded-md bg-muted border border-border text-sm p-2" /></Field>
      <Field label="Venue or meeting link" id="r-venue"><input id="r-venue" value={venue} onChange={e => setVenue(e.target.value)} maxLength={300} className="w-full rounded-md bg-muted border border-border text-sm p-2" /></Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground">{round ? "Save round" : "Add round"}</button>
        {!round && <span className="text-xs text-muted-foreground ml-3">Applicants still in the drive are notified when a round has a start time.</span>}
      </div>
    </form>
  );
}

function DriveDetails({ job, onSave }: { job: Job; onSave: (patch: Record<string, unknown>) => void }) {
  const [category, setCategory] = useState(job.category ?? "");
  const [batch, setBatch] = useState(job.batchYear ? String(job.batchYear) : "");
  const dirty = category !== (job.category ?? "") || batch !== (job.batchYear ? String(job.batchYear) : "");
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({ category: category || null, batchYear: batch ? Number(batch) : null });
      }}
      className="flex items-end gap-2"
    >
      <Field label="Tier" id="d-cat"><input id="d-cat" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Dream" maxLength={40} className="w-28 rounded-md bg-muted border border-border text-xs p-2" /></Field>
      <Field label="Batch" id="d-batch"><input id="d-batch" value={batch} onChange={e => setBatch(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2027" inputMode="numeric" className="w-20 rounded-md bg-muted border border-border text-xs p-2" /></Field>
      {dirty && <button type="submit" className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground">Save</button>}
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
