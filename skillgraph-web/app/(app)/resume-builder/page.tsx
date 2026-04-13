"use client";

import { useState, useCallback } from "react";
import { FileText, Save, RefreshCw, Upload, Download, Wand2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import SectionEditor from "@/components/resume-builder/SectionEditor";
import AtsScorePreview from "@/components/resume-builder/AtsScorePreview";
import { Button } from "@/components/ui/button";

interface Breakdown {
  keywordMatch: { score: number; max: number; matchedCount: number; totalKeywords: number };
  format: { score: number; max: number };
  quantification: { score: number; max: number; numbersFound: number };
  actionVerbs: { score: number; max: number; verbsFound: number };
  completeness: { score: number; max: number };
}

export default function ResumeBuilderPage() {
  const [sections, setSections] = useState<Record<string, string>>({
    summary: "",
    skills: "",
    experience: "",
    projects: "",
    education: "",
    certifications: "",
  });
  const [targetJd, setTargetJd] = useState("");
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const generateFromProfile = useCallback(async () => {
    if (!targetJd.trim()) {
      alert('Please paste a target Job Description first.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/resume-builder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetJd }),
      });
      const data = await res.json();
      if (data.resume) {
        const r = data.resume;
        setSections({
          summary: r.summary || '',
          skills: [...(r.skills?.technical || []), ...(r.skills?.tools || [])].join(', '),
          experience: (r.experience || []).map((e: { role: string; company: string; duration: string; bullets: string[] }) =>
            [e.role, e.company, e.duration, ...(e.bullets || [])].join('\n')
          ).join('\n\n'),
          projects: (r.projects || []).map((p: { name: string; techStack: string[]; impact: string; bullets: string[] }) =>
            [p.name, (p.techStack || []).join(', '), p.impact, ...(p.bullets || [])].join('\n')
          ).join('\n\n'),
          education: r.education
            ? [r.education.degree, r.education.college, r.education.cgpa, r.education.year].join('\n')
            : '',
          certifications: (r.certifications || []).join('\n'),
        });
      }
    } catch {
      // ignore
    }
    setGenerating(false);
  }, [targetJd]);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/resume-builder/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'skillgraph_resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    setExporting(false);
  }, [sections]);

  const computeScore = useCallback(async () => {
    setScoring(true);
    try {
      const res = await fetch("/api/resume-builder/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, targetJd }),
      });
      const data = await res.json();
      setScore(data.score);
      setBreakdown(data.breakdown);
    } catch {
      // ignore
    }
    setScoring(false);
  }, [sections, targetJd]);

  const saveVersion = async () => {
    setSaving(true);
    try {
      await fetch("/api/resume-builder/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, targetJd, atsScore: score }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // ignore
    }
    setSaving(false);
  };

  return (
    <PageTransition>
      <DashboardLayout title="Resume Builder">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* Left — Editor (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Target JD */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Target Job Description
              </label>
              <textarea
                value={targetJd}
                onChange={e => setTargetJd(e.target.value)}
                placeholder="Paste the job description here for keyword-optimized ATS scoring..."
                rows={3}
                className="w-full p-3 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Section Editor */}
            <SectionEditor sections={sections} onChange={setSections} />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={generateFromProfile}
                disabled={generating}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 size={14} className="mr-2" />}
                {generating ? 'Generating...' : 'Generate from Profile'}
              </Button>
              <Button
                onClick={computeScore}
                disabled={scoring}
                className="gradient-primary text-primary-foreground font-semibold glow-primary"
              >
                {scoring ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText size={14} className="mr-2" />}
                Analyze ATS Score
              </Button>
              <Button
                onClick={saveVersion}
                disabled={saving}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : saved ? "✓ Saved" : <><Save size={14} className="mr-1.5" />Save</>}
              </Button>
              <Button
                onClick={exportPdf}
                disabled={exporting}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Download size={14} className="mr-1.5" />Export PDF</>}
              </Button>
            </div>
          </div>

          {/* Right — Score Preview (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <AtsScorePreview score={score} breakdown={breakdown} loading={scoring} />

            {/* Quick Tips */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Use strong action verbs: <span className="text-foreground font-medium">Developed, Implemented, Optimized, Deployed</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Quantify achievements: <span className="text-foreground font-medium">&ldquo;Reduced load time by 40%&rdquo;</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Mirror the JD&rsquo;s keywords in your skills and experience sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Fill all sections — ATS penalizes missing sections</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
