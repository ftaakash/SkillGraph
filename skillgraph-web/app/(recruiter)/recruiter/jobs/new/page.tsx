"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import JobPostForm from "@/components/faculty/JobPostForm";

export default function RecruiterPostJobPage() {
  const router = useRouter();

  return (
    <PageTransition>
      <DashboardLayout title="Post a Job">
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Create Job Posting</h2>
            <p className="text-sm text-muted-foreground mb-6">Post a new opening. Students matching your criteria will see it on their job board.</p>
            <JobPostForm apiEndpoint="/api/recruiter/jobs" onSuccess={() => router.push("/recruiter/talent")} />
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
