"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { istDate, istMinutes, addDays } from "@/lib/academics/calc";

type Event = {
  id: string;
  kind: "round" | "visit" | "deadline";
  title: string;
  subtitle: string | null;
  start: string;
  end: string | null;
  jobId: string;
};
type View = "week" | "month" | "agenda";

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_PX = 48;
const TONE: Record<Event["kind"], string> = {
  round: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
  visit: "bg-sky-500/15 border-sky-500/40 text-sky-100",
  deadline: "bg-amber-500/15 border-amber-500/40 text-amber-100",
};
const KIND_LABEL: Record<Event["kind"], string> = { round: "Round", visit: "Company visit", deadline: "Apply-by deadline" };

const dayHeader = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", timeZone: "UTC" });
const monthTitle = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const agendaDay = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

/** Monday of the week containing a YYYY-MM-DD date */
function weekStart(date: string) {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}
const monthStart = (date: string) => `${date.slice(0, 8)}01`;
/** India-midnight instant for a YYYY-MM-DD date */
const istMidnight = (date: string) => new Date(`${date}T00:00:00+05:30`);

function visibleRange(view: View, anchor: string): [string, string] {
  if (view === "week") {
    const s = weekStart(anchor);
    return [s, addDays(s, 7)];
  }
  if (view === "month") {
    const s = weekStart(monthStart(anchor));
    return [s, addDays(s, 42)];
  }
  return [anchor, addDays(anchor, 31)];
}

/** Places overlapping timed events side by side */
function layoutDay(events: Event[]) {
  const timed = events
    .map(e => {
      const start = Math.max(istMinutes(new Date(e.start)), HOUR_START * 60);
      const rawEnd = e.end ? istMinutes(new Date(e.end)) : start + 60;
      const end = Math.min(Math.max(rawEnd, start + 30), HOUR_END * 60);
      return { e, start, end, col: 0, cols: 1 };
    })
    .sort((a, b) => a.start - b.start);
  const columns: number[] = [];
  for (const item of timed) {
    let col = columns.findIndex(end => end <= item.start);
    if (col === -1) col = columns.length;
    columns[col] = item.end;
    item.col = col;
  }
  for (const item of timed) {
    item.cols = Math.max(1, ...timed.filter(o => o.start < item.end && o.end > item.start).map(o => o.col + 1));
  }
  return timed;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const jobHref = (id: string) => (session?.user?.role === "FACULTY" ? `/faculty/jobs/${id}` : `/jobs/${id}`);
  const [today] = useState(() => istDate(new Date()));
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState("");

  const [from, to] = visibleRange(view, anchor);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar?from=${encodeURIComponent(istMidnight(from).toISOString())}&to=${encodeURIComponent(istMidnight(to).toISOString())}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => !cancelled && setEvents(d.events))
      .catch(() => !cancelled && setError("Could not load the calendar."));
    return () => { cancelled = true; };
  }, [from, to]);

  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events ?? []) {
      const d = istDate(new Date(e.start));
      map.set(d, [...(map.get(d) ?? []), e]);
    }
    return map;
  }, [events]);

  const move = (dir: number) =>
    setAnchor(a => {
      if (view === "week") return addDays(a, 7 * dir);
      if (view === "agenda") return addDays(a, 30 * dir);
      const d = new Date(`${monthStart(a)}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + dir);
      return d.toISOString().slice(0, 10);
    });

  const title = view === "month" ? monthTitle.format(new Date(`${monthStart(anchor)}T00:00:00Z`)) : monthTitle.format(new Date(`${from}T00:00:00Z`));
  const days = Array.from({ length: view === "week" ? 7 : 42 }, (_, i) => addDays(from, i));

  return (
    <PageTransition>
      <DashboardLayout title="Placement Calendar">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
          <div className="flex rounded-lg border border-border overflow-hidden text-sm" role="tablist" aria-label="Calendar view">
            {(["week", "month", "agenda"] as View[]).map(v => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 capitalize transition-colors ${view === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => move(-1)} className="p-2 rounded-md hover:bg-muted" aria-label="Previous"><ChevronLeft size={16} /></button>
            <button onClick={() => setAnchor(today)} className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted">Today</button>
            <button onClick={() => move(1)} className="p-2 rounded-md hover:bg-muted" aria-label="Next"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
          {(Object.keys(KIND_LABEL) as Event["kind"][]).map(k => (
            <span key={k} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm border ${TONE[k]}`} aria-hidden /> {KIND_LABEL[k]}</span>
          ))}
        </div>

        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : view === "week" ? (
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
                <div />
                {days.map(d => (
                  <div key={d} className={`px-2 py-2 text-xs font-medium text-center ${d === today ? "text-primary" : "text-muted-foreground"}`}>
                    {dayHeader.format(new Date(`${d}T00:00:00Z`))}
                    {/* Deadlines and visits without a time sit above the grid */}
                    <div className="mt-1 space-y-1">
                      {(byDay.get(d) ?? []).filter(e => e.kind !== "round").map(e => (
                        <Link key={e.id} href={jobHref(e.jobId)} className={`block text-left text-[10px] px-1.5 py-0.5 rounded border truncate ${TONE[e.kind]}`} title={`${e.title} · ${e.subtitle ?? ""}`}>
                          {e.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}>
                <div className="relative">
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                    <span key={i} className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2" style={{ top: i * HOUR_PX }}>
                      {i === 0 ? "" : `${((HOUR_START + i + 11) % 12) + 1} ${HOUR_START + i < 12 ? "AM" : "PM"}`}
                    </span>
                  ))}
                </div>
                {days.map(d => (
                  <div key={d} className={`relative border-l border-border/60 ${d === today ? "bg-primary/5" : ""}`}>
                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-border/40" style={{ top: i * HOUR_PX }} aria-hidden />
                    ))}
                    {layoutDay((byDay.get(d) ?? []).filter(e => e.kind === "round")).map(({ e, start, end, col, cols }) => (
                      <Link
                        key={e.id}
                        href={jobHref(e.jobId)}
                        title={`${e.title}${e.subtitle ? ` · ${e.subtitle}` : ""}`}
                        className={`absolute rounded-md border px-1.5 py-1 text-[10px] leading-tight overflow-hidden hover:z-10 ${TONE[e.kind]}`}
                        style={{
                          top: ((start - HOUR_START * 60) / 60) * HOUR_PX,
                          height: Math.max(((end - start) / 60) * HOUR_PX - 2, 20),
                          left: `calc(${(col / cols) * 100}% + 2px)`,
                          width: `calc(${100 / cols}% - 4px)`,
                        }}
                      >
                        <span className="block opacity-80">{timeFmt.format(new Date(e.start))}</span>
                        <span className="block font-medium">{e.title}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : view === "month" ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 text-[11px] text-muted-foreground border-b border-border">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="px-2 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map(d => {
                const list = byDay.get(d) ?? [];
                const inMonth = d.slice(0, 7) === monthStart(anchor).slice(0, 7);
                return (
                  <div key={d} className={`min-h-24 border-b border-r border-border/50 p-1.5 ${inMonth ? "" : "opacity-40"}`}>
                    <p className={`text-xs mb-1 ${d === today ? "text-primary font-semibold" : "text-muted-foreground"}`}>{Number(d.slice(8))}</p>
                    <div className="space-y-0.5">
                      {list.slice(0, 3).map(e => (
                        <Link key={e.id} href={jobHref(e.jobId)} title={e.title} className={`block text-[10px] px-1 py-0.5 rounded border truncate ${TONE[e.kind]}`}>
                          {e.kind === "round" ? `${timeFmt.format(new Date(e.start))} ` : ""}{e.title}
                        </Link>
                      ))}
                      {list.length > 3 && (
                        <button onClick={() => { setAnchor(d); setView("agenda"); }} className="text-[10px] text-muted-foreground hover:text-foreground">
                          +{list.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {events && events.length === 0 && (
              <p className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">Nothing scheduled in the next 30 days.</p>
            )}
            {[...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, list]) => (
              <section key={d}>
                <h3 className={`text-sm font-semibold mb-2 ${d === today ? "text-primary" : "text-foreground"}`}>{agendaDay.format(new Date(`${d}T00:00:00Z`))}</h3>
                <ul className="bg-card border border-border rounded-lg divide-y divide-border/60">
                  {list.map(e => (
                    <li key={e.id}>
                      <Link href={jobHref(e.jobId)} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                        <span className={`mt-1 w-2.5 h-2.5 rounded-sm border shrink-0 ${TONE[e.kind]}`} aria-hidden />
                        <span className="text-xs text-muted-foreground w-20 shrink-0">
                          {e.kind === "round" || e.kind === "deadline" ? timeFmt.format(new Date(e.start)) : "All day"}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-foreground">{e.title}</span>
                          {e.subtitle && <span className="block text-xs text-muted-foreground truncate">{e.subtitle}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
