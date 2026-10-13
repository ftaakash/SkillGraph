"use client";

import { CheckCircle2, XCircle, Circle, CircleDot, MinusCircle, MapPin, Clock } from "lucide-react";

export type TimelineRound = {
  id: string;
  position: number;
  name: string;
  kind: string;
  startsAt: string | null;
  endsAt: string | null;
  mode: string | null;
  venue: string | null;
  attendanceOpen: boolean;
  state: "cleared" | "rejected" | "absent" | "pending" | "upcoming" | "not_reached" | null;
  confirmation?: string | null;
  attendedAt?: string | null;
};

const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

const STATE: Record<NonNullable<TimelineRound["state"]>, { label: string; tone: string; icon: React.ReactNode }> = {
  cleared: { label: "Cleared", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: <CheckCircle2 size={18} className="text-emerald-400" /> },
  rejected: { label: "Not selected", tone: "text-red-400 border-red-500/30 bg-red-500/10", icon: <XCircle size={18} className="text-red-400" /> },
  absent: { label: "Absent", tone: "text-red-400 border-red-500/30 bg-red-500/10", icon: <MinusCircle size={18} className="text-red-400" /> },
  pending: { label: "In progress", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10", icon: <CircleDot size={18} className="text-amber-400" /> },
  upcoming: { label: "Upcoming", tone: "text-muted-foreground border-border bg-muted/40", icon: <Circle size={18} className="text-muted-foreground" /> },
  not_reached: { label: "Not reached", tone: "text-muted-foreground border-border bg-muted/20", icon: <Circle size={18} className="text-muted-foreground/50" /> },
};

/** A drive's rounds in order; with `showProgress`, each shows where the student stands. */
export default function RoundTimeline({ rounds, showProgress }: { rounds: TimelineRound[]; showProgress: boolean }) {
  return (
    <ol className="relative">
      {rounds.map((r, i) => {
        const state = showProgress && r.state ? STATE[r.state] : null;
        return (
          <li key={r.id} className="flex gap-3 pb-5 last:pb-0 relative">
            {i < rounds.length - 1 && <span className="absolute left-[8.5px] top-6 bottom-0 w-px bg-border" aria-hidden />}
            <span className="shrink-0 mt-0.5 bg-card">
              {state ? state.icon : <span className="flex w-[18px] h-[18px] items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">{r.position}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                {state && <span className={`text-[10px] px-2 py-0.5 rounded-full border ${state.tone}`}>{state.label}</span>}
                {showProgress && r.attendedAt && <span className="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-400">Attended</span>}
                {showProgress && r.confirmation === "declined" && <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Declined</span>}
                {r.attendanceOpen && !r.attendedAt && <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/40 text-primary">Check-in open</span>}
              </div>
              {(r.startsAt || r.venue || r.mode) && (
                <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {r.startsAt && <span className="flex items-center gap-1"><Clock size={11} /> {when.format(new Date(r.startsAt))}</span>}
                  {(r.venue || r.mode) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {[r.mode === "virtual" ? "Virtual" : r.mode === "physical" ? "In person" : null, r.venue].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
