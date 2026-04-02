"use client";

import { useState } from "react";

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  jobPostingId: string;
  user: { id: string; name: string; email: string; branch: string | null; cgpa: number | null; readinessScore: number | null };
}

const statuses = ["Applied", "Shortlisted", "OA", "Interview", "Offered", "Placed", "Rejected"];
const statusColors: Record<string, string> = {
  Applied: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Shortlisted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  OA: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Interview: "bg-primary/10 text-primary border-primary/20",
  Offered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Placed: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ApplicationTable({ applications: initial }: { applications: Application[] }) {
  const [apps, setApps] = useState(initial);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (appId: string, status: string) => {
    setUpdating(appId);
    try {
      const res = await fetch("/api/faculty/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status }),
      });
      if (res.ok) {
        setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      }
    } finally {
      setUpdating(null);
    }
  };

  if (apps.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">No applications yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="pb-3 pr-4">Student</th>
            <th className="pb-3 pr-4">Branch</th>
            <th className="pb-3 pr-4">CGPA</th>
            <th className="pb-3 pr-4">Readiness</th>
            <th className="pb-3 pr-4">Applied</th>
            <th className="pb-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-3 pr-4">
                <p className="font-medium text-foreground">{a.user.name}</p>
                <p className="text-xs text-muted-foreground">{a.user.email}</p>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{a.user.branch || "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">{a.user.cgpa?.toFixed(1) || "—"}</td>
              <td className="py-3 pr-4">
                <span className="text-primary font-semibold">{Math.round(a.user.readinessScore ?? 0)}%</span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground text-xs">
                {new Date(a.appliedAt).toLocaleDateString()}
              </td>
              <td className="py-3 pr-4">
                <select
                  value={a.status}
                  onChange={(e) => updateStatus(a.id, e.target.value)}
                  disabled={updating === a.id}
                  className={`text-xs font-semibold px-2 py-1 rounded-md border cursor-pointer bg-transparent ${statusColors[a.status] || "border-border text-muted-foreground"}`}
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
