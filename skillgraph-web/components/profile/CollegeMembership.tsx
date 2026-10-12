"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Me { role: string; collegeId: string | null; College: { name: string; city: string } | null }

/** Lets a student join (or leave) their college's SkillGraph workspace with a join code. */
export default function CollegeMembership() {
  const [me, setMe] = useState<Me | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/users/me").then(r => r.json()).then(d => setMe(d.user ?? null)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!me || me.role !== "STUDENT") return null;

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMessage(null);
    const res = await fetch("/api/users/me/college", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? { kind: "ok", text: `You joined ${data.college?.name}.` } : { kind: "error", text: data.error ?? "Could not join." });
    setBusy(false);
    if (res.ok) { setCode(""); load(); }
  };

  const leave = async () => {
    if (!window.confirm("Leave your college workspace? Your placement cell will no longer see your progress, and any college-provided plan ends.")) return;
    setBusy(true); setMessage(null);
    await fetch("/api/users/me/college", { method: "DELETE" });
    setBusy(false);
    load();
  };

  return (
    <section className="bg-card border border-border rounded-lg p-6" aria-labelledby="college-title">
      <h2 id="college-title" className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
        <GraduationCap size={16} className="text-primary" aria-hidden /> Your college
      </h2>
      {me.College ? (
        <>
          <p className="text-sm text-foreground mt-2">{me.College.name}{me.College.city ? `, ${me.College.city}` : ""}</p>
          <p className="text-xs text-muted-foreground mt-1">Your placement cell can see your readiness and applications to campus jobs.</p>
          <Button variant="outline" size="sm" onClick={leave} disabled={busy} className="mt-3 text-xs">Leave college workspace</Button>
        </>
      ) : (
        <form onSubmit={join} className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">Enter the join code from your placement cell to see campus jobs — and get Pro if your college has a licence.</p>
          <div className="flex gap-2">
            <label htmlFor="college-code" className="sr-only">College join code</label>
            <Input id="college-code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 7KQ2MX4P" autoComplete="off"
              className="bg-background uppercase tracking-wider" />
            <Button type="submit" size="sm" disabled={busy || code.trim().length < 6}>Join</Button>
          </div>
        </form>
      )}
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs mt-2 ${message.kind === "error" ? "text-destructive" : "text-primary"}`}>{message.text}</p>}
    </section>
  );
}
