"use client";

import { useState } from "react";
import { GripVertical, User } from "lucide-react";

interface StudentView {
  id: string;
  notes: string | null;
  student: { id: string; name: string; email: string; college: string | null; branch: string | null; readinessScore: number | null; targetRole: string | null };
}

interface PipelineKanbanProps {
  stages: string[];
  pipeline: Record<string, StudentView[]>;
}

const stageColors: Record<string, string> = {
  Shortlisted: "border-blue-500/30",
  Screening: "border-purple-500/30",
  Interview: "border-amber-500/30",
  Offer: "border-emerald-500/30",
  Hired: "border-green-500/30",
  Rejected: "border-destructive/30",
};

export default function PipelineKanban({ stages, pipeline: initial }: PipelineKanbanProps) {
  const [pipeline, setPipeline] = useState(initial);
  const [moving, setMoving] = useState<string | null>(null);

  const moveToStage = async (viewId: string, newStage: string) => {
    setMoving(viewId);
    try {
      const res = await fetch("/api/recruiter/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewId, stage: newStage }),
      });
      if (res.ok) {
        setPipeline(prev => {
          const updated = { ...prev };
          let movedItem: StudentView | undefined;
          for (const stage of stages) {
            const idx = updated[stage]?.findIndex(v => v.id === viewId);
            if (idx !== undefined && idx >= 0) {
              movedItem = updated[stage][idx];
              updated[stage] = updated[stage].filter((_, i) => i !== idx);
              break;
            }
          }
          if (movedItem) {
            updated[newStage] = [...(updated[newStage] || []), { ...movedItem, notes: newStage }];
          }
          return updated;
        });
      }
    } finally {
      setMoving(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(stage => (
        <div
          key={stage}
          className={`flex-shrink-0 w-64 bg-card border rounded-lg ${stageColors[stage] || "border-border"}`}
        >
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {pipeline[stage]?.length || 0}
              </span>
            </div>
          </div>
          <div className="p-2 space-y-2 min-h-[200px]">
            {(pipeline[stage] || []).map(view => (
              <div
                key={view.id}
                className={`p-3 bg-muted/50 rounded-md border border-border hover:border-primary/30 transition-colors ${moving === view.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{view.student.name}</p>
                    <p className="text-[10px] text-muted-foreground">{view.student.college || "—"} • {view.student.branch || "—"}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-primary font-semibold">{Math.round(view.student.readinessScore ?? 0)}%</span>
                      <select
                        value={stage}
                        onChange={(e) => moveToStage(view.id, e.target.value)}
                        disabled={moving === view.id}
                        className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground cursor-pointer"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(pipeline[stage] || []).length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                <User size={14} className="mr-1" /> Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
