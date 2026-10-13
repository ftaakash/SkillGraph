"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ListChecks } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import RoundTimeline, { type TimelineRound } from "@/components/placement/RoundTimeline";

type Application = {
  applicationId: string;
  status: string;
  channel: string;
  appliedAt: string;
  job: { id: string; title: string; company: string; jobType: string | null; deadline: string; driveDate: string | null };
  offered: boolean;
  eliminated: boolean;
  steps: { round: Omit<TimelineRound, "state" | "confirmation" | "attendedAt">; state: TimelineRound["state"]; confirmation: string; attendedAt: string | null }[];
};

type Filter = "all" | "active" | "offers" | "closed";
const FILTERS: [Filter, string][] = [["all", "All"], ["active", "In process"], ["offers", "Offers"], ["closed", "Not selected"]];
const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

function headline(a: Application) {
  if (a.offered) return { text: a.status === "Placed" ? "Placed" : "Offer", tone: "text-emerald-400 border-emerald-500/30" };
  if (a.eliminated) return { text: "Not selected", tone: "text-red-400 border-red-500/30" };
  const current = a.steps.find(s => s.state === "pending");
  return current
    ? { text: current.round.name, tone: "text-amber-400 border-amber-500/30" }
    : { text: a.status, tone: "text-muted-foreground border-border" };
}

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/tracker")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setApps(d.applications);
        setSelected(d.applications[0]?.applicationId ?? null);
      })
      .catch(() => setError("Could not load your applications."));
  }, []);

  const shown = useMemo(() => {
    const q = search.toLowerCase();
    return (apps ?? []).filter(a =>
      (filter === "all" ||
        (filter === "offers" && a.offered) ||
        (filter === "closed" && a.eliminated) ||
        (filter === "active" && !a.offered && !a.eliminated)) &&
      (!q || a.job.company.toLowerCase().includes(q) || a.job.title.toLowerCase().includes(q)),
    );
  }, [apps, search, filter]);
  const current = shown.find(a => a.applicationId === selected) ?? shown[0] ?? null;

  return (
    <PageTransition>
      <DashboardLayout title="Job Tracker">
        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : !apps ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <ListChecks size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-heading font-semibold text-foreground mb-1">No applications yet</p>
            <p className="text-sm text-muted-foreground">Apply to drives on the <Link href="/jobs" className="text-primary hover:underline">job board</Link> and follow every round here.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or role" className="pl-9 bg-muted border-border text-sm" />
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter applications">
                {FILTERS.map(([f, label]) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filter === f ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{apps.length} application{apps.length === 1 ? "" : "s"}</p>

            <div className="grid lg:grid-cols-[minmax(260px,340px)_1fr] gap-4">
              <ul className="bg-card border border-border rounded-lg divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
                {shown.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No applications match.</li>}
                {shown.map(a => {
                  const h = headline(a);
                  const active = current?.applicationId === a.applicationId;
                  return (
                    <li key={a.applicationId}>
                      <button
                        onClick={() => setSelected(a.applicationId)}
                        aria-current={active}
                        className={`w-full text-left px-4 py-3 transition-colors ${active ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      >
                        <p className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{a.job.company}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.job.title}</p>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <span className="text-[11px] text-muted-foreground">{day.format(new Date(a.appliedAt))}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border truncate max-w-[60%] ${h.tone}`}>{h.text}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {current && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                    <div>
                      <h2 className="font-heading text-xl font-semibold text-foreground">{current.job.company}</h2>
                      <p className="text-sm text-muted-foreground">{current.job.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/jobs/${current.job.id}`} className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary/40">View drive</Link>
                      <Link href={`/chat?job=${current.job.id}`} className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary/40">Drive chat</Link>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Application status</h3>
                  <ol className="mb-5">
                    <li className="flex items-center gap-2 text-sm text-foreground mb-4">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden />
                      Applied {current.channel === "external" ? "on the placement portal" : "on SkillGraph"} · {day.format(new Date(current.appliedAt))}
                    </li>
                  </ol>
                  {current.steps.length ? (
                    <RoundTimeline
                      rounds={current.steps.map(s => ({ ...s.round, state: s.state, confirmation: s.confirmation, attendedAt: s.attendedAt }))}
                      showProgress
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Rounds appear here once the placement cell publishes the hiring process.</p>
                  )}
                  {current.offered && (
                    <p className="mt-6 text-sm text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-md px-3 py-2">
                      {current.status === "Placed" ? "Placement confirmed. Congratulations!" : "You have an offer for this role. Congratulations!"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
