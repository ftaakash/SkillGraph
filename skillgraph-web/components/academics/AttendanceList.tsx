"use client";

import type { AcademicOverview } from "@/lib/academics/sync";
import type { CourseProjection } from "@/lib/academics/calc";

type Course = AcademicOverview["courses"][number];

const pct = (n: number) => `${n.toFixed(1)}%`;

/** Theory and practical courses with attended / absent / total and what it takes to stay at the threshold. */
export default function AttendanceList({
  courses,
  threshold,
  projection,
}: {
  courses: Course[];
  threshold: number;
  projection?: Map<string, CourseProjection> | null;
}) {
  const groups = [
    { label: "Theory", items: courses.filter(c => c.category === "theory") },
    { label: "Practical", items: courses.filter(c => c.category === "practical") },
  ].filter(g => g.items.length);

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <section key={group.label}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map(c => {
              const p = projection?.get(`${c.code}|${c.category}`);
              const shown = p ?? { ...c.attendance, attended: c.attended, conducted: c.conducted };
              const tone = shown.safe ? (shown.margin === 0 ? "amber" : "emerald") : "red";
              const toneText = { emerald: "text-emerald-400", amber: "text-amber-400", red: "text-red-400" }[tone];
              const toneBar = { emerald: "bg-emerald-400", amber: "bg-amber-400", red: "bg-red-400" }[tone];
              return (
                <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground leading-snug">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.code}
                        {c.faculty ? ` · ${c.faculty}` : ""}
                        {c.room ? ` · ${c.room}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex gap-1.5 text-xs tabular-nums" aria-label="Attended, absent and total classes">
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400" title="Attended">{shown.attended}</span>
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-400" title="Absent">{shown.conducted - shown.attended}</span>
                        <span className="px-2 py-1 rounded bg-muted text-muted-foreground" title="Conducted">{shown.conducted}</span>
                      </div>
                      <div className="text-right w-24">
                        <p className={`font-heading font-bold tabular-nums ${toneText}`}>{pct(shown.percent)}</p>
                        {p && Math.abs(p.change) >= 0.05 && (
                          <p className={`text-[11px] tabular-nums ${p.change < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {p.change > 0 ? "+" : ""}{p.change.toFixed(1)} pts
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-md border min-w-[96px] text-center ${
                        shown.safe ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"
                      }`}>
                        {shown.safe ? `Can miss ${shown.margin}` : `Attend ${shown.required}`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted relative overflow-hidden" aria-hidden>
                    <div className={`h-full rounded-full ${toneBar}`} style={{ width: `${Math.min(100, shown.percent)}%` }} />
                    <div className="absolute top-0 h-full w-px bg-foreground/50" style={{ left: `${threshold}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
