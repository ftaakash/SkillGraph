"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Star, MapPin, GraduationCap, Mail, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type RevealStatus = "none" | "requested" | "accepted" | "declined";

interface ShortlistView {
  id: string;
  revealStatus: RevealStatus;
  student: {
    id: string; name: string; email: string | null; college: string | null; branch: string | null;
    readinessScore: number | null; targetRole: string | null; linkedin: string | null; revealed: boolean;
  };
}

const STATUS_COPY: Record<RevealStatus, string> = {
  none: "Identity hidden",
  requested: "Awaiting candidate consent",
  accepted: "Contact shared",
  declined: "Candidate declined",
};

export default function RecruiterShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistView[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = () =>
    fetch("/api/recruiter/shortlist")
      .then(r => r.json())
      .then(d => { setShortlist(d.shortlist ?? []); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const removeFromShortlist = async (studentId: string) => {
    await fetch("/api/recruiter/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setShortlist(prev => prev.filter(v => v.student.id !== studentId));
  };

  const requestContact = async (studentId: string) => {
    const res = await fetch("/api/recruiter/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "");
    load();
  };

  return (
    <PageTransition>
      <DashboardLayout title="My Shortlist">
        <p className="text-xs text-muted-foreground mb-4">
          Candidates stay anonymous until they accept your contact request. Requests are shown to the candidate with your company name.
        </p>
        {message && <p role="status" className="text-sm text-primary mb-4">{message}</p>}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shortlist.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Star size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="font-heading font-semibold text-foreground mb-2">No Shortlisted Talent</p>
            <p className="text-sm text-muted-foreground">Browse Talent Discovery and star candidates to add them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shortlist.map(v => (
              <div key={v.id} className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {v.student.revealed ? v.student.name.charAt(0) : <Lock size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{v.student.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {v.student.email && <a href={`mailto:${v.student.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail size={10} />{v.student.email}</a>}
                      {v.student.college && <span className="flex items-center gap-1"><MapPin size={10} />{v.student.college}</span>}
                      {v.student.branch && <span className="flex items-center gap-1"><GraduationCap size={10} />{v.student.branch}</span>}
                      {v.student.targetRole && <span className="text-primary/80">{v.student.targetRole}</span>}
                    </div>
                    <p className="text-[11px] mt-1 text-muted-foreground">{STATUS_COPY[v.revealStatus] ?? v.revealStatus}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-semibold text-sm">{Math.round(v.student.readinessScore ?? 0)}%</span>
                  {(v.revealStatus === "none" || v.revealStatus === "declined") && (
                    <Button size="sm" variant="outline" onClick={() => requestContact(v.student.id)} className="text-xs gap-1">
                      <Send size={12} /> Request contact
                    </Button>
                  )}
                  <button
                    onClick={() => removeFromShortlist(v.student.id)}
                    aria-label="Remove from shortlist"
                    title="Remove from shortlist"
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Star size={16} className="fill-primary text-primary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
