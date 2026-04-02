"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import PipelineKanban from "@/components/recruiter/PipelineKanban";

export default function RecruiterPipelinePage() {
  const [pipeline, setPipeline] = useState<Record<string, unknown[]>>({});
  const [stages, setStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/pipeline")
      .then(r => r.json())
      .then(d => {
        setPipeline(d.pipeline ?? {});
        setStages(d.stages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Hiring Pipeline">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <PipelineKanban stages={stages} pipeline={pipeline as any} />
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
