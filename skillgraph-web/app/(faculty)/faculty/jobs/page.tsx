"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Calendar, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

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

export default function FacultyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/jobs")
      .then(r => r.json())
      .then(d => { setJobs(d.jobs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Job Postings">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground text-sm">{jobs.length} active postings</p>
          <Link href="/faculty/jobs/new">
            <Button className="gradient-primary text-primary-foreground font-semibold glow-primary">
              <Plus className="mr-2" size={16} /> Post New Job
            </Button>
          </Link>
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
                    <h3 className="font-heading text-base font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                  </div>
                  <div className="text-right">
                    {(job.ctcMin || job.ctcMax) && (
                      <p className="text-sm font-semibold text-primary">
                        ₹{job.ctcMin ?? "—"} – {job.ctcMax ?? "—"} LPA
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {job.applicationCount} applications</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
