"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, CheckCircle2, XCircle, QrCode } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";

type Item = {
  applicationId: string;
  job: { id: string; title: string; company: string };
  round: { id: string; position: number; name: string; startsAt: string | null; endsAt: string | null; mode: string | null; venue: string | null; attendanceOpen: boolean };
  confirmation: "pending" | "confirmed" | "declined";
  attendedAt: string | null;
  canRespond: boolean;
  canCheckIn: boolean;
  past: boolean;
};

type Filter = "all" | "pending" | "confirmed" | "declined";
const FILTERS: [Filter, string][] = [["all", "All"], ["pending", "Awaiting response"], ["confirmed", "Confirmed"], ["declined", "Declined"]];
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

export default function ParticipationPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = useCallback(() =>
    fetch("/api/participation")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setItems(d.rounds))
      .catch(() => setError("Could not load your rounds.")), []);

  useEffect(() => { load(); }, [load]);

  const act = async (roundId: string, body: Record<string, string>) => {
    setBusy(roundId);
    try {
      const res = await fetch("/api/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages(m => ({
        ...m,
        [roundId]: res.ok
          ? { ok: true, text: body.action === "check_in" ? "You're checked in." : body.action === "confirm" ? "Confirmed." : "Declined." }
          : { ok: false, text: data.error ?? "Something went wrong" },
      }));
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  const active = useMemo(() => (items ?? []).filter(i => i.canCheckIn), [items]);
  const shown = useMemo(
    () => (items ?? []).filter(i => filter === "all" || i.confirmation === filter).sort((a, b) => Number(a.past) - Number(b.past)),
    [items, filter],
  );

  return (
    <PageTransition>
      <DashboardLayout title="Participation">
        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : !items ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground">Check in</h2>
              <p className="text-sm text-muted-foreground mb-4">When a round starts, enter the code the placement cell shows at the venue.</p>
              {active.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                  <QrCode size={28} className="mx-auto mb-2" />
                  No check-ins open right now.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {active.map(i => (
                    <form
                      key={i.round.id}
                      onSubmit={e => {
                        e.preventDefault();
                        void act(i.round.id, { action: "check_in", code: codes[i.round.id] ?? "" });
                      }}
                      className="bg-card border border-primary/40 rounded-lg p-4"
                    >
                      <p className="text-xs text-muted-foreground">{i.job.company}</p>
                      <p className="font-medium text-foreground mb-3">Round {i.round.position}: {i.round.name}</p>
                      <div className="flex gap-2">
                        <label htmlFor={`code-${i.round.id}`} className="sr-only">Check-in code</label>
                        <input
                          id={`code-${i.round.id}`}
                          value={codes[i.round.id] ?? ""}
                          onChange={e => setCodes(c => ({ ...c, [i.round.id]: e.target.value.toUpperCase() }))}
                          placeholder="Code"
                          autoComplete="off"
                          maxLength={12}
                          className="flex-1 rounded-md bg-muted border border-border text-sm p-2 tracking-widest uppercase"
                          required
                        />
                        <button type="submit" disabled={busy === i.round.id} className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                          Check in
                        </button>
                      </div>
                      {messages[i.round.id] && (
                        <p className={`text-xs mt-2 ${messages[i.round.id].ok ? "text-emerald-400" : "text-red-400"}`} role="status">{messages[i.round.id].text}</p>
                      )}
                    </form>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground">Round confirmation</h2>
              <p className="text-sm text-muted-foreground mb-4">Tell the placement cell whether you&apos;ll take part. You can respond until 15 minutes before a round starts.</p>
              <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filter rounds">
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

              {shown.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                  {items.length === 0 ? <>Rounds for drives you&apos;re in will appear here. Browse the <Link href="/jobs" className="text-primary hover:underline">job board</Link>.</> : "No rounds match."}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {shown.map(i => {
                    const status = i.attendedAt
                      ? { label: "Attended", tone: "border-sky-500/30 text-sky-400" }
                      : i.confirmation === "confirmed"
                        ? { label: "Confirmed", tone: "border-emerald-500/30 text-emerald-400" }
                        : i.confirmation === "declined"
                          ? { label: "Declined", tone: "border-border text-muted-foreground" }
                          : i.canRespond
                            ? { label: "Awaiting response", tone: "border-amber-500/30 text-amber-400" }
                            : { label: i.past ? "Expired" : "Responses closed", tone: "border-border text-muted-foreground" };
                    return (
                      <div key={i.round.id} className={`bg-card border border-border rounded-lg p-4 flex flex-col ${i.past ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{i.job.company}</p>
                            <Link href={`/jobs/${i.job.id}`} className="font-medium text-foreground hover:text-primary leading-snug">{i.job.title}</Link>
                            <p className="text-xs text-muted-foreground">Round {i.round.position} · {i.round.name}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${status.tone}`}>{status.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mb-3">
                          {i.round.startsAt && <p className="flex items-center gap-1"><Clock size={11} /> {when.format(new Date(i.round.startsAt))}</p>}
                          {(i.round.venue || i.round.mode) && (
                            <p className="flex items-center gap-1"><MapPin size={11} /> {[i.round.mode === "virtual" ? "Virtual" : i.round.mode === "physical" ? "In person" : null, i.round.venue].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        {i.canRespond && !i.attendedAt && (
                          <div className="mt-auto flex gap-2">
                            <button
                              onClick={() => act(i.round.id, { action: "confirm" })}
                              disabled={busy === i.round.id || i.confirmation === "confirmed"}
                              className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> I&apos;ll attend
                            </button>
                            <button
                              onClick={() => act(i.round.id, { action: "decline" })}
                              disabled={busy === i.round.id || i.confirmation === "declined"}
                              className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-md border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 disabled:opacity-50"
                            >
                              <XCircle size={12} /> Decline
                            </button>
                          </div>
                        )}
                        {messages[i.round.id] && !i.canCheckIn && (
                          <p className={`text-xs mt-2 ${messages[i.round.id].ok ? "text-emerald-400" : "text-red-400"}`} role="status">{messages[i.round.id].text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
