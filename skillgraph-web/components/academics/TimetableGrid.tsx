"use client";

import type { TimetableEntry } from "@/lib/academics/types";
import { toMinutes } from "@/lib/academics/calc";

/** The week as day orders (columns) × periods (rows), with today's day order highlighted. */
export default function TimetableGrid({ timetable, todayOrder }: { timetable: TimetableEntry[]; todayOrder: number | null }) {
  if (!timetable.length) {
    return <p className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">Your timetable appears here after your university sync.</p>;
  }
  const orders = [...new Set(timetable.map(e => e.dayOrder))].sort((a, b) => a - b);
  const starts = [...new Set(timetable.map(e => e.start))].sort((a, b) => toMinutes(a) - toMinutes(b));
  const at = (order: number, start: string) => timetable.filter(e => e.dayOrder === order && e.start === start);

  return (
    <div className="overflow-x-auto bg-card border border-border rounded-lg">
      <table className="w-full text-xs border-collapse min-w-[640px]">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground font-medium w-16">Time</th>
            {orders.map(o => (
              <th key={o} className={`p-2 text-left font-semibold ${o === todayOrder ? "text-primary" : "text-foreground"}`}>
                Day {o}{o === todayOrder ? " · today" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {starts.map(start => (
            <tr key={start} className="border-t border-border/60">
              <td className="p-2 text-muted-foreground tabular-nums align-top">{start}</td>
              {orders.map(o => (
                <td key={o} className={`p-1.5 align-top ${o === todayOrder ? "bg-primary/5" : ""}`}>
                  {at(o, start).map(e => (
                    <div key={`${e.courseCode}-${e.category}`} className={`rounded-md px-2 py-1.5 border ${e.category === "practical" ? "border-violet-500/30 bg-violet-500/10" : "border-border bg-muted/40"}`}>
                      <p className="text-foreground leading-tight">{e.title}{e.category === "practical" ? " (Lab)" : ""}</p>
                      {e.room && <p className="text-muted-foreground mt-0.5">{e.room}</p>}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
