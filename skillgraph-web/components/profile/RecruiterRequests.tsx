"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RevealRequest {
  id: string;
  status: "requested" | "accepted" | "declined";
  requestedAt: string | null;
  company: string;
  companyWebsite: string | null;
}

const STATUS_LABEL: Record<RevealRequest["status"], string> = {
  requested: "Waiting for your answer",
  accepted: "You shared your contact details",
  declined: "You declined",
};

/** Lets a student decide which recruiters may see their name and contact details. */
export default function RecruiterRequests() {
  const [requests, setRequests] = useState<RevealRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/talent-requests")
      .then(r => r.json())
      .then(d => setRequests(d.requests ?? []))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: "accept" | "decline" | "revoke") => {
    setBusy(id); setError("");
    const res = await fetch(`/api/talent-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not update the request.");
    setBusy(null);
    load();
  };

  if (!requests || requests.length === 0) return null;

  return (
    <section id="recruiter-requests" className="bg-card border border-border rounded-lg p-6" aria-labelledby="recruiter-requests-title">
      <h2 id="recruiter-requests-title" className="font-heading text-base font-semibold text-foreground">Recruiter contact requests</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Recruiters see only your anonymous profile. Your name, email, college and links are shared only with companies you accept.
      </p>
      {error && <p role="alert" className="text-destructive text-xs mb-3">{error}</p>}
      <ul className="space-y-3">
        {requests.map(r => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 justify-between border border-border rounded-md p-3">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={16} className="text-muted-foreground shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.companyWebsite ? <a href={r.companyWebsite} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.company}</a> : r.company}
                </p>
                <p className="text-[11px] text-muted-foreground">{STATUS_LABEL[r.status]}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {r.status !== "accepted" && (
                <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "accept")} className="text-xs">Share contact</Button>
              )}
              {r.status === "requested" && (
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "decline")} className="text-xs">Decline</Button>
              )}
              {r.status === "accepted" && (
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "revoke")} className="text-xs">Stop sharing</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
