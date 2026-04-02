"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Brain, Target, Zap, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

interface User { name: string; targetRole: string; readinessScore: number }
interface Gap { id: string; missingSkill: string; urgency: string; weeksToLearn: number; whyImportant: string; closed: boolean }
interface Sprint { id: string; dayTasks: DayTask[]; completionPercentage: number; skillsTargeted: string[] }
interface DayTask { day: number; focus: string; topic: string; time_minutes: number }
interface Skill { id: string; skillName: string; category: string; proficiency: string }

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadStep, setUploadStep] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setUploadError(''); }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024, maxFiles: 1,
    onDropRejected: () => setUploadError('Please upload a PDF under 5MB')
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setUploadError(''); setUploadStep(1);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); setUploadStep(0); return; }
      setUploadStep(2);
      await fetch('/api/gaps', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ targetRole: user?.targetRole ?? 'Industrial AI Engineer' }),
      });
      setUploadStep(3);
      window.location.reload();
    } catch { setUploadError('Upload failed. Please try again.'); setUploadStep(0); }
    finally { setUploading(false); }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then(r => r.json()),
      fetch('/api/gaps').then(r => r.json()),
      fetch('/api/sprints').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
    ]).then(([u, g, s, sk]) => {
      setUser(u.user);
      setGaps(g.gaps ?? []);
      setSprint(s.sprint);
      setSkills(sk.skills ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const activeGaps = gaps.filter(g => !g.closed);
  const readiness = Math.round(user?.readinessScore ?? 0);
  
  const mapProficiency = (prof: string) => {
    switch (prof.toLowerCase()) {
      case 'beginner': return 35;
      case 'intermediate': return 70;
      case 'advanced': return 95;
      default: return 50;
    }
  };

  return (
    <PageTransition>
      <DashboardLayout title="Dashboard">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Brain size={20} />} label="Skills Mapped" value={skills.length.toString()} trend="Active Profiling" trendUp />
          <StatCard icon={<Target size={20} />} label="Open Positions" value={activeGaps.length.toString()} trend={`${gaps.length - activeGaps.length} Closed`} trendUp />
          <StatCard icon={<Zap size={20} />} label="Sprint Completion" value={sprint ? `${Math.round(sprint.completionPercentage)}%` : "0%"} trend={sprint ? "Active" : "No Sprint"} trendUp={!!sprint} />
          <StatCard icon={<TrendingUp size={20} />} label="Floor Rank" value={`${readiness}th`} trend="Percentile" trendUp />
        </div>

        {skills.length === 0 ? (
          <div className="bg-card border border-border flex flex-col items-center justify-center rounded-lg p-12 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
             <Brain size={48} className="text-primary mb-6 animate-pulse-glow" />
             <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Initialize Neural Profile</h2>
             <p className="text-muted-foreground mb-8">Upload your resume to map your skills and begin analyzing the market for gaps.</p>
             
             {uploadStep === 0 && (
               <div className="w-full max-w-sm">
                 <div {...getRootProps()} className={`w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}>
                   <input {...getInputProps()} />
                   {file ? <span className="text-success font-medium">{file.name}</span> : <span className="text-muted-foreground text-sm font-medium">Drop PDF resume here</span>}
                 </div>
                 {uploadError && <div className="text-destructive text-xs mt-3 bg-destructive/10 p-2 rounded">{uploadError}</div>}
                 <Button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-6 gradient-primary text-primary-foreground font-semibold glow-primary">
                    Inject Resume
                 </Button>
               </div>
             )}
             
             {uploadStep > 0 && uploadStep < 3 && (
               <div className="flex flex-col items-center justify-center p-8">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-sm font-bold text-primary tracking-widest uppercase animate-pulse">
                   {uploadStep === 1 ? 'Uploading Asset...' : 'Analyzing Architecture...'}
                 </p>
               </div>
             )}
             
             {uploadStep === 3 && (
               <div className="p-8">
                 <p className="text-success font-bold text-sm">Initialization Complete. Reloading...</p>
               </div>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Skills */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Brain size={18} className="text-primary" /> Portfolio
              </h2>
              <div className="space-y-4">
                {skills.slice(0, 6).map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground font-medium">{s.skillName}</span>
                      <span className="text-xs text-muted-foreground">{mapProficiency(s.proficiency)}%</span>
                    </div>
                    <Progress value={mapProficiency(s.proficiency)} className="h-2" />
                    <span className="text-xs text-muted-foreground">{s.category || 'General'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target size={18} className="text-primary" /> Open Gaps
              </h2>
              {activeGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No open gaps detected. You are ready for the market.</p>
              ) : (
                <div className="space-y-3">
                  {activeGaps.slice(0, 5).map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{g.missingSkill}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          g.urgency === "high" ? "bg-destructive/10 text-destructive" :
                          g.urgency === "medium" ? "bg-primary/10 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>{g.urgency.toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium text-primary">In Progress</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sprint */}
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <Zap size={18} className="text-primary" /> Active Sprint
              </h2>
              {!sprint ? (
                 <div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
                   <Zap size={32} className="text-muted-foreground mb-2" />
                   <p className="text-sm text-muted-foreground">No active sprint running.</p>
                   <Button onClick={() => router.push('/sprint')} variant="outline" className="text-xs bg-muted/50">
                     Initialize Sprint
                   </Button>
                 </div>
              ) : (
                 <>
                  <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <Clock size={12} /> {Math.round(sprint.completionPercentage)}% Complete
                  </p>
                  <div className="space-y-3">
                    {sprint.dayTasks.slice(0, 5).map((t, i) => {
                      const done = (i * 100 / sprint.dayTasks.length) < sprint.completionPercentage;
                      return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        done ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"
                      }`}>
                        <CheckCircle2 size={18} className={done ? "text-success mt-0.5 min-w-[18px]" : "text-muted-foreground mt-0.5 min-w-[18px]"} />
                        <span className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"} line-clamp-2`}>
                          {t.topic}
                        </span>
                      </div>
                    )})}
                  </div>
                 </>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
