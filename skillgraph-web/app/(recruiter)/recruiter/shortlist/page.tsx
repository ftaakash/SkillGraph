"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Star, MapPin, GraduationCap } from "lucide-react";

interface ShortlistView {
  id: string;
  student: { id: string; name: string; email: string; college: string | null; branch: string | null; readinessScore: number | null; targetRole: string | null };
}

export default function RecruiterShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/shortlist")
      .then(r => r.json())
      .then(d => { setShortlist(d.shortlist ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const removeFromShortlist = async (studentId: string) => {
    await fetch("/api/recruiter/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setShortlist(prev => prev.filter(v => v.student.id !== studentId));
  };

  return (
    <PageTransition>
      <DashboardLayout title="My Shortlist">
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
              <div key={v.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {v.student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{v.student.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {v.student.college && <span className="flex items-center gap-1"><MapPin size={10} />{v.student.college}</span>}
                      {v.student.branch && <span className="flex items-center gap-1"><GraduationCap size={10} />{v.student.branch}</span>}
                      {v.student.targetRole && <span className="text-primary/80">{v.student.targetRole}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-primary font-semibold text-sm">{Math.round(v.student.readinessScore ?? 0)}%</span>
                  <button onClick={() => removeFromShortlist(v.student.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
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
