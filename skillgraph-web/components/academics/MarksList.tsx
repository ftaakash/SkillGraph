"use client";

import type { AcademicOverview } from "@/lib/academics/sync";

type Course = AcademicOverview["courses"][number];

/** Per-course assessment components (e.g. CT-1, CT-2) with a running total of what is published. */
export default function MarksList({ courses }: { courses: Course[] }) {
  if (!courses.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {courses.map(c => {
        const t = c.marksTotal;
        return (
          <div key={c.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground leading-snug">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.code} · {c.category === "practical" ? "Practical" : "Theory"}
                  {c.credits !== null ? ` · ${c.credits} credit${c.credits === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              {t.percent !== null && (
                <div className="text-right shrink-0">
                  <p className="font-heading font-bold text-primary tabular-nums">{t.scored.toFixed(t.scored % 1 ? 1 : 0)} / {t.max}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{t.percent.toFixed(0)}%</p>
                </div>
              )}
            </div>
            {c.marks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No marks published yet.</p>
            ) : (
              <ul className="space-y-2">
                {c.marks.map(m => (
                  <li key={m.name} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="tabular-nums text-foreground">{m.scored === null ? "—" : `${m.scored} / ${m.max}`}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden" aria-hidden>
                      {m.scored !== null && <div className="h-full bg-primary rounded-full" style={{ width: `${(m.scored / m.max) * 100}%` }} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
