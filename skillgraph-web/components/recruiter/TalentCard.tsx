"use client";

import { Star, StarOff, GraduationCap, MapPin } from "lucide-react";

interface Skill {
  id: string;
  skillName: string;
  category: string;
  proficiency: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  college: string | null;
  branch: string | null;
  year: string | null;
  targetRole: string | null;
  readinessScore: number | null;
  cgpa: number | null;
  skills: Skill[];
}

interface TalentCardProps {
  student: Student;
  isShortlisted?: boolean;
  onToggleShortlist?: (studentId: string) => void;
}

const profBadge: Record<string, string> = {
  beginner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  advanced: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function TalentCard({ student, isShortlisted, onToggleShortlist }: TalentCardProps) {
  const readiness = Math.round(student.readinessScore ?? 0);

  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {student.name}
          </h3>
          <p className="text-xs text-muted-foreground">{student.email}</p>
        </div>
        <button
          onClick={() => onToggleShortlist?.(student.id)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
        >
          {isShortlisted ? (
            <Star size={18} className="text-primary fill-primary" />
          ) : (
            <StarOff size={18} className="text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
        {student.college && (
          <span className="flex items-center gap-1"><MapPin size={11} /> {student.college}</span>
        )}
        {student.branch && (
          <span className="flex items-center gap-1"><GraduationCap size={11} /> {student.branch} {student.year && `• ${student.year}`}</span>
        )}
        {student.targetRole && (
          <span className="text-primary/80 font-medium">{student.targetRole}</span>
        )}
      </div>

      {/* Readiness bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Readiness</span>
          <span className="text-primary font-semibold">{readiness}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${readiness}%` }} />
        </div>
      </div>

      {/* Skills */}
      {(student.skills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {student.skills.slice(0, 6).map((s, i) => (
            <span
              key={s.skillName || i}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${profBadge[s.proficiency.toLowerCase()] || "bg-muted border-border text-muted-foreground"}`}
            >
              {s.skillName}
            </span>
          ))}
          {student.skills.length > 6 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
              +{student.skills.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
