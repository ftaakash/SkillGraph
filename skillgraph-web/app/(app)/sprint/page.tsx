"use client";

import { useEffect, useState } from 'react';
import { Zap, Calendar, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface DayTask { day: number; focus: string; topic: string; resource_type: string; resource_title: string; resource_url: string; time_minutes: number; mini_task: string; checkpoint: string }
interface Sprint { id: string; dayTasks: DayTask[]; completionPercentage: number; skillsTargeted: string[]; status: string }

export default function SprintPage() {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [checked, setChecked] = useState<boolean[]>(Array(7).fill(false));
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/sprints').then(r => r.json()).then(d => {
      setSprint(d.sprint);
      if (d.sprint) {
        const completedDays = Math.round((d.sprint.completionPercentage / 100) * 7);
        setChecked(Array(7).fill(false).map(((_, i) => i < completedDays)));
      }
      setLoading(false);
    });
  }, []);

  const toggleDay = async (index: number) => {
    if (!sprint) return;
    const newChecked = [...checked];
    newChecked[index] = !newChecked[index];
    setChecked(newChecked);
    const completedCount = newChecked.filter(Boolean).length;
    const res = await fetch(`/api/sprints/${sprint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedCount }),
    });
    const data = await res.json();
    if (data.sprint) {
      setSprint(s => s ? { ...s, completionPercentage: data.sprint.completionPercentage, status: data.sprint.status } : s);
      if (data.sprint.status === 'completed') setShowConfetti(true);
    }
  };

  const pct = sprint?.completionPercentage ?? 0;
  const days = (sprint?.dayTasks as DayTask[]) ?? [];
  const completedCount = checked.filter(Boolean).length;
  
  if (loading) return (
     <DashboardLayout title="7-Day Sprint">
       <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-primary font-bold tracking-widest text-sm uppercase animate-pulse">Initializing Sprint Target...</div>
       </div>
     </DashboardLayout>
  );

  if (!sprint) return (
    <PageTransition>
      <DashboardLayout title="7-Day Sprint">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-card border border-border rounded-lg p-12 max-w-md text-center shadow-lg">
            <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Initialize New Sprint</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Your neural architecture lacks a scheduled sprint. Generate a dynamic 7-day technical mission based on your capability gaps.</p>
            <Button onClick={async () => {
              setGenerating(true); setErrorMsg('');
              const r = await fetch('/api/sprints', { method: 'POST' }).then(r => r.json());
              if (r.error) {
                 setErrorMsg(r.error);
              } else if (r.sprint) {
                setSprint(r.sprint);
                setChecked(Array(7).fill(false));
              }
              setGenerating(false);
            }} disabled={generating} className="w-full gradient-primary text-primary-foreground font-semibold glow-primary">
               {generating ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Execute Sequence'}
            </Button>
            {errorMsg && <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold rounded-lg text-center">{errorMsg}</div>}
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );

  return (
    <PageTransition>
      <DashboardLayout title="7-Day Sprint">
        {showConfetti && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg p-12 text-center max-w-sm mx-4 shadow-2xl animate-in zoom-in slide-in-from-bottom-5">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-heading font-bold mb-3 text-foreground">Sprint Complete!</h2>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Your readiness score just increased. Let's keep the momentum going!</p>
              <Button onClick={() => setShowConfetti(false)} className="w-full gradient-primary text-primary-foreground glow-primary">
                Acknowledge
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
           <h2 className="text-xl font-heading font-bold text-foreground mb-2">{(sprint.skillsTargeted as string[]).join(' / ')}</h2>
           <p className="text-muted-foreground font-body text-sm">Targeted learning vectors compiled from your capability gaps.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary">
              <Zap size={20} className="glow-text" />
              <span className="font-heading font-semibold text-foreground">Sprint Momentum</span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">{completedCount}/7 Execute Cycles</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--primary),0.5)]" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {days.map((day, i) => {
             const isDone = checked[i];
             return (
               <div key={day.day} className={`bg-card border rounded-lg p-6 transition-all duration-300 relative overflow-hidden group 
                  ${isDone ? 'border-success/30' : 'border-border hover:border-primary/40'}`}>
                  
                  {isDone && <div className="absolute inset-0 bg-success/5 pointer-events-none"></div>}

                  <div className="flex flex-col md:flex-row md:items-start gap-4 lg:gap-6 relative z-10">
                    <button onClick={() => toggleDay(i)}
                      className={`mt-1 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110
                      ${isDone ? 'text-success' : 'text-muted-foreground hover:text-primary'}`}>
                      {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar size={16} className={isDone ? 'text-success' : 'text-primary'} />
                        <h3 className={`font-heading font-semibold text-lg ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>Day {day.day}</h3>
                        <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-2 ${isDone ? 'bg-success/10 border-success/20 text-success' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                          {day.focus}
                        </span>
                      </div>

                      <h4 className={`text-md font-medium mb-4 transition-colors ${isDone ? 'text-muted-foreground' : 'text-foreground'}`}>{day.topic}</h4>

                      <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                         <a href={day.resource_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 group/link">
                            <div className="w-8 h-8 bg-background rounded-md flex items-center justify-center border border-border shadow-sm group-hover/link:border-primary transition-colors">
                               {/* Use a generic link icon to match style */}
                               <svg className="w-4 h-4 text-muted-foreground group-hover/link:text-primary transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-0.5">Resource material</div>
                              <div className={`text-sm font-semibold transition ${isDone ? 'text-muted-foreground' : 'text-primary hover:underline'}`}>{day.resource_title}</div>
                            </div>
                         </a>
                         <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-foreground tracking-widest bg-background border border-border shadow-sm px-2 py-1 rounded">~{day.time_minutes} min req.</span>
                         </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                         <div className="flex-1 bg-background/50 border border-border rounded-lg p-3">
                            <div className="flex gap-2 items-start">
                               <span className="text-primary mt-0.5"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg></span>
                               <div>
                                  <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Execution Task</h5>
                                  <p className={`text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{day.mini_task}</p>
                               </div>
                            </div>
                         </div>
                         <div className="flex-1 bg-background/50 border border-border rounded-lg p-3">
                            <div className="flex gap-2 items-start">
                               <span className="text-success mt-0.5"><CheckCircle2 size={14} /></span>
                               <div>
                                  <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Completion Checkpoint</h5>
                                  <p className={`text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{day.checkpoint}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
               </div>
             )
          })}
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
