"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Calendar, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import CsvImportCard from "@/components/faculty/CsvImportCard";

interface Job {
  id: string;
  title: string;
  company: string;
  ctcMin: number | null;
  ctcMax: number | null;
  deadline: string;
  applicationCount: number;
  createdAt: string;
}

const istDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const lpa = (min: number | null, max: number | null) =>
  min && max && min !== max ? `₹${min}–${max} LPA` : min || max ? `₹${min || max} LPA` : null;

export default function FacultyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    fetch("/api/faculty/jobs")
      .then(r => r.json())
      .then(d => { setJobs(d.jobs ?? []); setNow(Date.now()); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageTransition>
      <DashboardLayout title="Job Postings">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground text-sm">{jobs.length} drive{jobs.length === 1 ? "" : "s"} · {jobs.filter(j => new Date(j.deadline).getTime() >= now).length} open</p>
          <Link href="/faculty/jobs/new">
            <Button className="gradient-primary text-primary-foreground font-semibold glow-primary">
              <Plus className="mr-2" size={16} /> Post New Job
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <CsvImportCard
            title="Import drives from your placement portal"
            description="Upload a CSV export of drives (for example from Haveloc). Rows with an external_ref update the matching drive on re-import, so you can upload the same export again as it changes."
            endpoint="/api/faculty/jobs/import"
            templateHref="/api/faculty/jobs/import"
            summary={r => `${r.created ?? 0} new and ${r.updated ?? 0} updated drive${(Number(r.created ?? 0) + Number(r.updated ?? 0)) === 1 ? "" : "s"}.`}
            onImported={load}
          />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Briefcase size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No job postings yet. Create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/faculty/jobs/${job.id}`} className="font-heading text-base font-semibold text-foreground hover:text-primary">{job.title}</Link>
                    <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                  </div>
                  <div className="text-right">
                    {(job.ctcMin || job.ctcMax) && (
                      <p className="text-sm font-semibold text-primary">
                        {lpa(job.ctcMin, job.ctcMax)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(job.deadline).getTime() < now ? "Closed" : "Apply by"} {istDate.format(new Date(job.deadline))}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {job.applicationCount} application{job.applicationCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
