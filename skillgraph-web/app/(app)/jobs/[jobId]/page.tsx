"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  ctcMin: number | null;
  ctcMax: number | null;
  minCgpa: number | null;
  eligibleBranches: string[];
  deadline: string;
  driveDate: string | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then(r => r.json())
      .then(d => {
        const found = (d.jobs ?? []).find((j: Job) => j.id === jobId);
        setJob(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: jobId, coverLetter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to apply");
        return;
      }
      setApplied(true);
    } catch {
      setError("Network error");
    } finally {
      setApplying(false);
    }
  };

  return (
    <PageTransition>
      <DashboardLayout title="Job Details">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Job Board
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !job ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Job not found.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* JD */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-1">{job.title}</h2>
                <p className="text-muted-foreground text-sm mb-6">{job.company}</p>

                <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
                  {(job.ctcMin || job.ctcMax) && (
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <DollarSign size={14} /> ₹{job.ctcMin ?? "—"} – {job.ctcMax ?? "—"} LPA
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Calendar size={14} /> Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                  {job.driveDate && <span className="flex items-center gap-1"><Calendar size={14} /> Drive: {new Date(job.driveDate).toLocaleDateString()}</span>}
                </div>

                {job.eligibleBranches?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-2">Eligible Branches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.eligibleBranches.map(b => (
                        <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-6">
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Job Description</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {job.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Apply */}
            <div>
              <div className="bg-card border border-border rounded-lg p-6 sticky top-8">
                {applied ? (
                  <div className="text-center py-4">
                    <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
                    <p className="font-heading font-semibold text-foreground mb-1">Application Sent!</p>
                    <p className="text-sm text-muted-foreground">Your placement cell will review your application.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-heading text-base font-semibold text-foreground mb-4">Apply to this Position</h3>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cover Letter (optional)</label>
                      <textarea
                        rows={5}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Why are you a good fit for this role?"
                        className="w-full rounded-md bg-muted border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    {error && (
                      <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg mb-4">{error}</div>
                    )}
                    <Button
                      onClick={handleApply}
                      disabled={applying}
                      className="w-full gradient-primary text-primary-foreground font-semibold glow-primary"
                    >
                      {applying ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      ) : (
                        <Send className="mr-2" size={16} />
                      )}
                      Submit Application
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
