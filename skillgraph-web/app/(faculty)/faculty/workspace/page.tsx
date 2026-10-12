"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, KeyRound, RefreshCw, ShieldCheck, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface Workspace {
  college: { name: string; city: string; state: string; tier: string };
  isAdmin: boolean;
  studentJoinCode: string | null;
  facultyInviteCode: string | null;
  students: { joined: number; licensedSeats: number; covered: number };
  licences: { seats: number | null; periodStart: string | null; periodEnd: string | null }[];
  faculty: { id: string; name: string; email: string; isCollegeAdmin: boolean }[];
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

function CodeCard({ label, help, code, onRotate, rotating }: { label: string; help: string; code: string; onRotate?: () => void; rotating?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3 mt-2">
        <code className="font-mono text-2xl font-bold tracking-[0.2em] text-foreground">{code}</code>
        <Button size="sm" variant="ghost" onClick={copy} aria-label={`Copy ${label}`}><Copy size={14} /></Button>
        {copied && <span className="text-xs text-primary" role="status">Copied</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{help}</p>
      {onRotate && (
        <Button size="sm" variant="outline" onClick={onRotate} disabled={rotating} className="mt-3 text-xs gap-1">
          <RefreshCw size={12} className={rotating ? "animate-spin" : ""} /> Generate new code
        </Button>
      )}
    </div>
  );
}

export default function FacultyWorkspacePage() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [rotating, setRotating] = useState<"student" | "faculty" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/faculty/workspace")
      .then(r => r.json())
      .then(d => (d.college ? setWs(d) : setError(d.error ?? "Could not load the workspace.")))
      .catch(() => setError("Could not load the workspace."));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rotate = async (which: "student" | "faculty") => {
    const warning = which === "student"
      ? "Students who already joined stay in the workspace. The old code stops working. Continue?"
      : "Faculty who already joined keep access. The old invite code stops working. Continue?";
    if (!window.confirm(warning)) return;
    setRotating(which);
    const res = await fetch("/api/faculty/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate", which }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not rotate the code.");
    setRotating(null);
    load();
  };

  return (
    <PageTransition>
      <DashboardLayout title="College Workspace">
        {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
        {!ws ? (
          !error && <div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>
        ) : (
          <div className="max-w-5xl space-y-6">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">{ws.college.name}</h2>
              <p className="text-sm text-muted-foreground">{[ws.college.city, ws.college.state].filter(Boolean).join(", ")} · {ws.college.tier}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {ws.studentJoinCode && (
                <CodeCard
                  label="Student join code"
                  help="Share with your students. They enter it on their Profile page to join your workspace, campus job board and cohort analytics."
                  code={ws.studentJoinCode}
                  onRotate={ws.isAdmin ? () => rotate("student") : undefined}
                  rotating={rotating === "student"}
                />
              )}
              {ws.facultyInviteCode && (
                <CodeCard
                  label="Faculty invite code (admins only)"
                  help="Gives placement-cell colleagues access to your students' data. Share it only with staff."
                  code={ws.facultyInviteCode}
                  onRotate={() => rotate("faculty")}
                  rotating={rotating === "faculty"}
                />
              )}
            </div>

            <section className="bg-card border border-border rounded-lg p-6 grid gap-4 md:grid-cols-3" aria-label="Seats">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Students joined</p>
                <p className="text-3xl font-heading font-bold text-foreground tabular-nums">{ws.students.joined}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Licensed seats</p>
                <p className="text-3xl font-heading font-bold text-foreground tabular-nums">{ws.students.licensedSeats}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Students on Pro via licence</p>
                <p className="text-3xl font-heading font-bold text-primary tabular-nums">{ws.students.covered}</p>
              </div>
              <p className="md:col-span-3 text-xs text-muted-foreground">
                Seats cover students in the order they joined. {ws.students.joined > ws.students.licensedSeats && ws.students.licensedSeats > 0 && "Some students are not covered — add seats to include everyone. "}
                <Link href="/billing" className="text-primary hover:underline">Manage licence</Link>
              </p>
            </section>

            <section className="bg-card border border-border rounded-lg p-6" aria-labelledby="faculty-title">
              <h2 id="faculty-title" className="font-heading text-base font-semibold text-foreground flex items-center gap-2 mb-3"><Users size={16} /> Placement-cell members</h2>
              <ul className="divide-y divide-border">
                {ws.faculty.map(f => (
                  <li key={f.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="text-foreground">{f.name} <span className="text-muted-foreground">· {f.email}</span></span>
                    {f.isCollegeAdmin && <span className="flex items-center gap-1 text-xs text-primary"><ShieldCheck size={12} /> Admin</span>}
                  </li>
                ))}
              </ul>
              {!ws.isAdmin && <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><KeyRound size={12} /> Ask an admin to share the faculty invite code with new colleagues.</p>}
            </section>

            {ws.licences.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Licence periods: {ws.licences.map(l => `${l.seats ?? 0} seats, ${date(l.periodStart)} – ${date(l.periodEnd)}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
