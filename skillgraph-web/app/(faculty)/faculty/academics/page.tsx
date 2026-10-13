"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, AlertTriangle, Link2, CalendarDays, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import CsvImportCard from "@/components/faculty/CsvImportCard";
import { Input } from "@/components/ui/input";

interface Student {
  id: string;
  name: string;
  email: string;
  branch: string | null;
  year: string | null;
  courses: number;
  overallPercent: number | null;
  atRisk: { code: string; title: string; category: string; percent: number; required: number }[];
  connection: { status: string; lastSyncAt: string | null } | null;
}

interface Cohort {
  threshold: number;
  calendarDays: number;
  totals: { students: number; withRecords: number; atRisk: number; connected: number };
  students: Student[];
}

export default function FacultyAcademicsPage() {
  const [data, setData] = useState<Cohort | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlyAtRisk, setOnlyAtRisk] = useState(true);

  const load = useCallback(() => {
    const failed = "Could not load your college's academic records.";
    return fetch("/api/faculty/academics")
      .then(r => (r.ok ? r.json().then(setData) : setError(failed)))
      .catch(() => setError(failed));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.students ?? [])
      .filter(s => !onlyAtRisk || s.atRisk.length > 0)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.branch ?? "").toLowerCase().includes(q))
      .sort((a, b) => b.atRisk.length - a.atRisk.length || (a.overallPercent ?? 101) - (b.overallPercent ?? 101));
  }, [data, search, onlyAtRisk]);

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
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<GraduationCap size={18} />} label={`of ${data.totals.students} students have records`} value={String(data.totals.withRecords)} />
              <StatCard icon={<AlertTriangle size={18} />} label={`Below ${data.threshold}% in a course`} value={String(data.totals.atRisk)} />
              <StatCard icon={<Link2 size={18} />} label="Connected to university sync" value={String(data.totals.connected)} />
              <StatCard icon={<CalendarDays size={18} />} label="Calendar days imported" value={String(data.calendarDays)} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <CsvImportCard
                title="Attendance & marks"
                description="One row per student per course. Students are matched by the email they joined your workspace with. Add a column per assessment named mark:<name>/<max>, e.g. mark:CT-1/5; leave a cell empty if not published yet."
                endpoint="/api/faculty/academics/import"
                templateHref="/api/faculty/academics/import?template=records"
                extraBody={{ kind: "records" }}
                summary={r => `${r.courses ?? 0} course records for ${r.students ?? 0} students.`}
                onImported={load}
              />
              <CsvImportCard
                title="Academic calendar"
                description="One row per date with its day order (1–5), or an empty day order and a label for holidays. Students use it for their day order, next class and attendance predictions."
                endpoint="/api/faculty/academics/import"
                templateHref="/api/faculty/academics/import?template=calendar"
                extraBody={{ kind: "calendar" }}
                summary={r => `${r.days ?? 0} calendar days.`}
                onImported={load}
              />
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
                <h3 className="font-heading font-semibold text-foreground">Attendance risk</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={onlyAtRisk} onChange={e => setOnlyAtRisk(e.target.checked)} />
                    Only students below {data.threshold}%
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students" className="pl-8 h-8 text-sm bg-muted border-border w-52" />
                  </div>
                </div>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground p-8 text-center">
                  {data.totals.withRecords === 0 ? "No attendance records yet. Import a CSV above to get started." : "No students match."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Student</th>
                        <th className="px-4 py-2 font-medium">Overall</th>
                        <th className="px-4 py-2 font-medium">Courses below {data.threshold}%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(s => (
                        <tr key={s.id} className="border-t border-border/60 align-top">
                          <td className="px-4 py-3">
                            <p className="text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{[s.email, s.branch, s.year].filter(Boolean).join(" · ")}</p>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {s.overallPercent === null ? <span className="text-muted-foreground">—</span> : `${s.overallPercent.toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-3">
                            {s.atRisk.length === 0 ? (
                              <span className="text-xs text-emerald-400">None</span>
                            ) : (
                              <ul className="space-y-1">
                                {s.atRisk.map(c => (
                                  <li key={`${c.code}-${c.category}`} className="text-xs">
                                    <span className="text-foreground">{c.title}</span>
                                    <span className="text-muted-foreground">{c.category === "practical" ? " (Lab)" : ""} · </span>
                                    <span className="text-red-400 tabular-nums">{c.percent.toFixed(1)}%</span>
                                    <span className="text-muted-foreground"> · needs {c.required} more</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
