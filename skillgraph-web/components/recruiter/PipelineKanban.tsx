"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { GripVertical, User } from "lucide-react";

interface StudentView {
  id: string;
  notes: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    college: string | null;
    branch: string | null;
    readinessScore: number | null;
    targetRole: string | null;
  };
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

// ── Draggable Card ──────────────────────────────────────────────
function KanbanCard({ view, isDragging }: { view: StudentView; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: view.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-muted/50 rounded-md border border-border hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing select-none ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{view.student.name}</p>
          <p className="text-[10px] text-muted-foreground">{view.student.college || "—"} • {view.student.branch || "—"}</p>
          <p className="text-[10px] text-primary font-semibold mt-1">{Math.round(view.student.readinessScore ?? 0)}% readiness</p>
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ────────────────────────────────────────────
function KanbanColumn({ stage, cards }: { stage: string; cards: StudentView[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      className={`flex-shrink-0 w-64 bg-card border rounded-lg transition-colors ${stageColors[stage] || "border-border"} ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
    >
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
      </div>
      <div ref={setNodeRef} className="p-2 space-y-2 min-h-[200px]">
        {cards.map(view => (
          <KanbanCard key={view.id} view={view} />
        ))}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <User size={14} className="mr-1" /> Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Kanban ─────────────────────────────────────────────────
export default function PipelineKanban({ stages, pipeline: initial }: PipelineKanbanProps) {
  const [pipeline, setPipeline] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findStage = (viewId: string) =>
    stages.find(s => pipeline[s]?.some(v => v.id === viewId));

  const findView = (viewId: string) => {
    for (const stage of stages) {
      const found = pipeline[stage]?.find(v => v.id === viewId);
      if (found) return found;
    }
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const fromStage = findStage(active.id as string);
    const toStage = over.id as string;
    if (!fromStage || fromStage === toStage || !stages.includes(toStage)) return;

    // Optimistic update
    setPipeline(prev => {
      const updated = { ...prev };
      const item = updated[fromStage].find(v => v.id === active.id);
      if (!item) return prev;
      updated[fromStage] = updated[fromStage].filter(v => v.id !== active.id);
      updated[toStage] = [...(updated[toStage] || []), { ...item, notes: toStage }];
      return updated;
    });

    // Persist to backend
    await fetch("/api/recruiter/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewId: active.id, stage: toStage }),
    });
  };

  const activeView = activeId ? findView(activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <KanbanColumn key={stage} stage={stage} cards={pipeline[stage] || []} />
        ))}
      </div>

      <DragOverlay>
        {activeView && (
          <div className="p-3 bg-card border border-primary/40 rounded-md shadow-xl opacity-90">
            <p className="text-sm font-medium text-foreground">{activeView.student.name}</p>
            <p className="text-[10px] text-muted-foreground">{activeView.student.branch || "—"}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
