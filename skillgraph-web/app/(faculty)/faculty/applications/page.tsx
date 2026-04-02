"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import ApplicationTable from "@/components/faculty/ApplicationTable";

export default function FacultyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/applications")
      .then(r => r.json())
      .then(d => { setApplications(d.applications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Student Applications">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6">
            <ApplicationTable applications={applications} />
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
