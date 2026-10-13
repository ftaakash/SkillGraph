"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, AlertTriangle, CalendarDays, Clock, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import AttendanceList from "@/components/academics/AttendanceList";
import SmartAdjust from "@/components/academics/SmartAdjust";
import MarksList from "@/components/academics/MarksList";
import TimetableGrid from "@/components/academics/TimetableGrid";
import ConnectPanel from "@/components/academics/ConnectPanel";
import type { AcademicOverview } from "@/lib/academics/sync";
import type { CourseProjection } from "@/lib/academics/calc";

type Tab = "attendance" | "marks" | "timetable" | "connection";
const TABS: [Tab, string][] = [["attendance", "Attendance"], ["marks", "Marks"], ["timetable", "Timetable"], ["connection", "Connection"]];

const longDay = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function startsIn(date: string, start: string, now: number) {
  const ms = new Date(`${date}T${start}:00+05:30`).getTime() - now;
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 24 ? `in ${Math.floor(h / 24)}d` : h ? `in ${h}h ${m}m` : `in ${m}m`;
}

export default function AcademicsPage() {
  const [data, setData] = useState<AcademicOverview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("attendance");
  const [adjusting, setAdjusting] = useState(false);
  const [projection, setProjection] = useState<Map<string, CourseProjection> | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(() => {
    const failed = "Could not load your academic record.";
    return fetch("/api/academics")
      .then(r => (r.ok ? r.json().then((d: AcademicOverview) => { setData(d); setNow(Date.now()); }) : setError(failed)))
      .catch(() => setError(failed));
  }, []);

  useEffect(() => { load(); }, [load]);

  const empty = data && data.courses.length === 0;

  return (
    <PageTransition>
      <DashboardLayout title="Academics">
        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : !data ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<GraduationCap size={18} />}
                label={data.overall.conducted ? `${data.overall.attended} of ${data.overall.conducted} classes` : "Overall attendance"}
                value={data.overall.conducted ? `${data.overall.percent.toFixed(1)}%` : "—"}
              />
              <StatCard
                icon={<AlertTriangle size={18} />}
                label={`Courses below ${data.threshold}%`}
                value={String(data.overall.below)}
                trend={data.overall.below ? "Needs attention" : undefined}
              />
              <StatCard
                icon={<CalendarDays size={18} />}
                label={longDay.format(new Date(`${data.today.date}T00:00:00Z`))}
                value={data.today.dayOrder ? `Day order ${data.today.dayOrder}` : "No classes"}
              />
              <StatCard
                icon={<Clock size={18} />}
                label={data.nextClass ? `${data.nextClass.entry.start}${data.nextClass.entry.room ? ` · ${data.nextClass.entry.room}` : ""}` : "Next class"}
                value={data.nextClass && now ? `${data.nextClass.entry.title.slice(0, 22)} ${startsIn(data.nextClass.date, data.nextClass.entry.start, now)}` : "—"}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex rounded-lg border border-border overflow-hidden text-sm" role="tablist" aria-label="Academics sections">
                {TABS.map(([t, label]) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 transition-colors ${tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "attendance" && !empty && (
                <button
                  onClick={() => {
                    setAdjusting(a => !a);
                    setProjection(null);
                  }}
                  aria-expanded={adjusting}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border transition-colors ${adjusting ? "border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <SlidersHorizontal size={14} /> Smart Adjust
                </button>
              )}
            </div>

            {empty && tab !== "connection" ? (
              <div className="bg-card border border-border rounded-lg p-10 text-center">
                <GraduationCap size={36} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-heading font-semibold text-foreground mb-1">No academic record yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your university account, or ask your placement cell to import attendance and marks.
                </p>
                <button onClick={() => setTab("connection")} className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground">
                  Connect university
                </button>
              </div>
            ) : tab === "attendance" ? (
              <div className="space-y-5">
                {adjusting && (
                  <SmartAdjust data={data} onProjection={setProjection} onLeavesChanged={load} />
                )}
                {projection && (
                  <p className="text-xs text-primary" role="status">Showing projected attendance. Clear the selection to return to current figures.</p>
                )}
                <AttendanceList courses={data.courses} threshold={data.threshold} projection={adjusting ? projection : null} />
              </div>
            ) : tab === "marks" ? (
              <MarksList courses={data.courses} />
            ) : tab === "timetable" ? (
              <TimetableGrid timetable={data.timetable} todayOrder={data.today.dayOrder} />
            ) : (
              <ConnectPanel data={data} onChanged={load} />
            )}

            {data.profile && (
              <p className="text-xs text-muted-foreground mt-8">
                {[data.profile.regNo, data.profile.program, data.profile.department, data.profile.semester ? `Semester ${data.profile.semester}` : null, data.profile.section]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
