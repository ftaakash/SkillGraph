"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import JobPostForm from "@/components/faculty/JobPostForm";

export default function NewJobPage() {
  const router = useRouter();

  return (
    <PageTransition>
      <DashboardLayout title="Post New Job">
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Create Campus Job Posting</h2>
            <p className="text-sm text-muted-foreground mb-6">Fill in the details below. Eligible students will see this posting on their job board.</p>
            <JobPostForm onSuccess={() => router.push("/faculty/jobs")} />
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
