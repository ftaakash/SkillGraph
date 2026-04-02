"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionEditorProps {
  sections: Record<string, string>;
  onChange: (sections: Record<string, string>) => void;
}

const SECTION_CONFIG = [
  { key: "summary", label: "Professional Summary", placeholder: "Passionate software engineer with 2+ years of experience in full-stack development...", icon: "📝" },
  { key: "skills", label: "Technical Skills", placeholder: "React, TypeScript, Node.js, Python, PostgreSQL, Docker, AWS...", icon: "💡" },
  { key: "experience", label: "Experience / Internships", placeholder: "Software Engineering Intern\nGoogle — Summer 2025\n• Developed a microservice reducing latency by 40%...", icon: "💼" },
  { key: "projects", label: "Projects", placeholder: "SkillGraph (Full Stack)\n• Built an AI-powered career intelligence platform...", icon: "🚀" },
  { key: "education", label: "Education", placeholder: "B.Tech Computer Science\nIIT Delhi — 2023-2027\nCGPA: 8.5/10", icon: "🎓" },
  { key: "certifications", label: "Certifications & Achievements", placeholder: "AWS Certified Cloud Practitioner\nSmart India Hackathon — 1st Place", icon: "🏆" },
];

export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [expanded, setExpanded] = useState<string | null>("summary");

  const updateSection = (key: string, value: string) => {
    onChange({ ...sections, [key]: value });
  };

  return (
    <div className="space-y-2">
      {SECTION_CONFIG.map((sec) => {
        const isOpen = expanded === sec.key;
        const hasContent = (sections[sec.key] || "").trim().length > 0;

        return (
          <div key={sec.key} className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : sec.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{sec.icon}</span>
                <span className="text-sm font-semibold text-foreground">{sec.label}</span>
                {hasContent && (
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </div>
              {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-border">
                <textarea
                  value={sections[sec.key] || ""}
                  onChange={(e) => updateSection(sec.key, e.target.value)}
                  placeholder={sec.placeholder}
                  rows={5}
                  className="w-full mt-3 p-3 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">
                    <Sparkles size={12} className="mr-1" /> AI Enhance
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
