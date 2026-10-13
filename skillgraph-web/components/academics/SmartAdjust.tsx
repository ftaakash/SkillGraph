"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AcademicOverview } from "@/lib/academics/sync";
import { projectAttendance, classKey, istMinutes, type CourseProjection } from "@/lib/academics/calc";

type Mode = "predict" | "leave";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function monthDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const days: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = new Date(first); d.getUTCMonth() === month; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Pick future days you expect to miss and see where each course would land, or mark
 * on-duty / medical-leave days (saved) so they count as attended.
 */
export default function SmartAdjust({
  data,
  onProjection,
  onLeavesChanged,
}: {
  data: AcademicOverview;
  onProjection: (p: Map<string, CourseProjection> | null) => void;
  onLeavesChanged: () => Promise<void>;
}) {
  const today = data.today.date;
  const [mode, setMode] = useState<Mode>("predict");
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [absent, setAbsent] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const dayOrders = useMemo(() => new Map(data.calendar.map(d => [d.date, d.dayOrder])), [data.calendar]);
  const labels = useMemo(() => new Map(data.calendar.map(d => [d.date, d.label])), [data.calendar]);
  const leaves = useMemo(() => new Map(data.leaves.map(l => [l.date, l.kind])), [data.leaves]);
  const canPredict = data.timetable.length > 0 && data.calendar.length > 0;

  const until = absent.length ? absent.reduce((a, b) => (a > b ? a : b)) : null;
  const projection = useMemo(() => {
    if (!until && !data.leaves.some(l => l.date < today)) return null;
    const result = projectAttendance({
      courses: data.courses,
      timetable: data.timetable,
      calendar: data.calendar,
      from: today,
      until: until ?? today,
      absent,
      leaves: data.leaves.map(l => l.date),
      threshold: data.threshold,
      nowMinutes: istMinutes(new Date()),
    });
    return new Map(result.map(r => [classKey(r.code, r.category), r]));
  }, [absent, until, today, data]);

  const apply = () => onProjection(projection);
  const clear = () => {
    setAbsent([]);
    onProjection(null);
  };

  const toggleLeave = async (date: string) => {
    const current = leaves.get(date);
    const next = current === undefined ? "OD" : current === "OD" ? "ML" : null;
    setSaving(date);
    setError("");
    try {
      const res = next
        ? await fetch("/api/academics/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, kind: next }) })
        : await fetch(`/api/academics/leaves?date=${date}`, { method: "DELETE" });
      if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Could not save that day");
      await onLeavesChanged();
    } finally {
      setSaving(null);
    }
  };

  const onDay = (date: string) => {
    if (mode === "leave") return void toggleLeave(date);
    if (date < today || !dayOrders.get(date)) return;
    setAbsent(a => (a.includes(date) ? a.filter(d => d !== date) : [...a, date]));
  };

  const move = (delta: number) =>
    setCursor(c => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm" role="tablist" aria-label="Smart Adjust mode">
          {([["predict", "Predict"], ["leave", "OD / ML"]] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 transition-colors ${mode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-1.5 rounded-md hover:bg-muted" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium w-36 text-center">{monthLabel.format(new Date(Date.UTC(cursor.year, cursor.month, 1)))}</span>
          <button onClick={() => move(1)} className="p-1.5 rounded-md hover:bg-muted" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>

      {!canPredict && mode === "predict" ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Predictions need your timetable and the academic calendar. They arrive with your university sync, or when your college imports its calendar.
        </p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map(d => <div key={d} className="text-[11px] text-center text-muted-foreground pb-1">{d}</div>)}
          {monthDays(cursor.year, cursor.month).map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const order = dayOrders.get(date);
            const leave = leaves.get(date);
            const selected = absent.includes(date);
            const past = date < today;
            const disabled = mode === "predict" ? past || !order : !order;
            return (
              <button
                key={date}
                onClick={() => onDay(date)}
                disabled={disabled || saving === date}
                title={labels.get(date) ?? undefined}
                aria-pressed={selected || Boolean(leave)}
                aria-label={`${longDate.format(new Date(`${date}T00:00:00Z`))}${order ? `, day order ${order}` : ", no classes"}${leave ? `, ${leave}` : ""}`}
                className={`h-14 rounded-md border text-left px-2 py-1 transition-colors disabled:cursor-default ${
                  selected
                    ? "border-red-500/50 bg-red-500/15"
                    : leave
                      ? "border-sky-500/50 bg-sky-500/10"
                      : order
                        ? "border-border hover:border-primary/40" + (past ? " opacity-60" : "")
                        : "border-transparent bg-muted/30 opacity-50"
                } ${date === today ? "ring-1 ring-primary" : ""}`}
              >
                <span className="block text-sm tabular-nums">{Number(date.slice(8))}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {leave ?? (order ? `D${order}` : labels.get(date) ? "Holiday" : "")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-md">
          {mode === "predict"
            ? until
              ? `Missing ${absent.length} day${absent.length > 1 ? "s" : ""}, attending every other class until ${longDate.format(new Date(`${until}T00:00:00Z`))}.`
              : "Tap the days you expect to miss. Saved OD/ML days count as attended."
            : "Tap a day to mark it OD, tap again for ML, a third time to clear. Past OD/ML days count as attended until the university record catches up."}
        </p>
        {mode === "predict" && (
          <div className="flex gap-2">
            <button onClick={clear} className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted">Clear</button>
            <button onClick={apply} disabled={!projection} className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
              Show projection
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-2" role="alert">{error}</p>}
    </div>
  );
}
