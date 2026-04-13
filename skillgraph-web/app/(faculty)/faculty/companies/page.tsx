"use client";

import { useEffect, useState } from "react";
import { Building2, ExternalLink, CheckCircle, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";

interface Company {
  id: string | null;
  name: string;
  website: string | null;
  tier: string;
  verificationStatus: string;
  hrEmail: string | null;
  logoUrl: string | null;
  jobCount: number;
}

const tierColors: Record<string, string> = {
  FAANG: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Unicorn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MNC: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Service: "bg-green-500/10 text-green-400 border-green-500/20",
  Startup: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Unknown: "bg-muted text-muted-foreground border-border",
};

export default function FacultyCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/companies")
      .then(r => r.json())
      .then(d => { setCompanies(d.companies || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Companies">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Registered Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">All companies that have posted jobs to your campus placement board.</p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Building2 size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No companies yet. Create a job posting with a company to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((c, idx) => (
              <div key={c.id ?? idx} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 shadow-sm hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-foreground text-base">{c.name}</h2>
                    {c.hrEmail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.hrEmail}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap ${tierColors[c.tier] || tierColors.Unknown}`}>
                    {c.tier}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {c.verificationStatus === "VERIFIED" ? (
                      <CheckCircle size={12} className="text-green-400" />
                    ) : (
                      <Clock size={12} className="text-amber-400" />
                    )}
                    {c.verificationStatus === "VERIFIED" ? "Verified" : "Unverified"}
                  </span>
                  <span>·</span>
                  <span>{c.jobCount} {c.jobCount === 1 ? "job" : "jobs"} posted</span>
                </div>

                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                  >
                    <ExternalLink size={11} /> Visit website
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
