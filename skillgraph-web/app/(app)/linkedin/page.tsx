"use client";

import { useState } from 'react';
import { Briefcase, Sparkles, ArrowRight, Copy, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface OptimizedProfile { headline: string; about: string; skills: string[]; keywords_added: string[]; ats_score_estimate_before: number; ats_score_estimate_after: number; improvement_tips: string[] }

export default function LinkedInPage() {
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [skillsList, setSkillsList] = useState('');
  const [result, setResult] = useState<OptimizedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedSection, setCopiedSection] = useState<'headline' | 'about' | null>(null);

  const handleOptimize = async () => {
    if (!headline || !about || !skillsList) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/linkedin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, about, skillsList }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Optimization failed'); return; }
      setResult(data.result);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleCopy = (text: string, section: 'headline' | 'about') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <PageTransition>
      <DashboardLayout title="LinkedIn Optimizer">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center glow-primary shadow-sm text-primary-foreground">
             <Briefcase size={20} />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">AI Profile Analysis</h2>
            <p className="text-sm text-muted-foreground">Rewrite your profile to bypass ATS and maximize visibility.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* INPUT FORM SECTION */}
          <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                Source Architecture
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Headline (Current)</label>
                  <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. B.Tech CSE Student | Developer"
                    className="bg-background border-border text-foreground focus:border-primary transition-colors w-full" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">About / Summary</label>
                  <Textarea value={about} onChange={e => setAbout(e.target.value)} rows={5} placeholder="Paste your LinkedIn About section..."
                    className="bg-background border-border text-foreground focus:border-primary transition-colors w-full resize-none" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">System Skills (Comma Separated)</label>
                  <Input value={skillsList} onChange={e => setSkillsList(e.target.value)} placeholder="React, Node.js, Python, SQL..."
                    className="bg-background border-border text-foreground focus:border-primary transition-colors w-full" />
                </div>

                {error && <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg font-medium">{error}</div>}
                
                <Button onClick={handleOptimize} disabled={loading || !headline || !about || !skillsList}
                  className="w-full mt-4 gradient-primary text-primary-foreground font-semibold glow-primary">
                  {loading ? (
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-spin" /> Initializing Engine...</div>
                  ) : (
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Initialize AI Rewrite</div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* OUTPUT SECTION */}
          <div className="lg:col-span-12 xl:col-span-7">
            <div className="bg-card border border-border rounded-lg p-6 relative overflow-hidden h-full shadow-sm flex flex-col">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-6 flex items-center gap-2 relative z-10">
                Optimized Output
              </h3>

              {!result ? (
                <div className="border-2 border-dashed border-border rounded-lg bg-background flex flex-col items-center justify-center flex-1 min-h-[400px]">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                     <Sparkles className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">Awaiting input to begin optimization protocol.</p>
                </div>
              ) : (
                <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 flex-1">
                  
                  {/* Score Diff Component */}
                  <div className="bg-background border border-border rounded-lg p-6 flex flex-col sm:flex-row gap-6 items-center justify-between shadow-sm">
                    <div className="flex gap-8 items-center w-full justify-center sm:justify-start">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Before</div>
                        <div className="text-3xl font-heading font-black text-destructive drop-shadow-sm">{result.ats_score_estimate_before}</div>
                      </div>
                      <div className="text-muted-foreground">
                         <ArrowRight className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-success/80 font-bold uppercase tracking-widest mb-1 glow-text">After</div>
                        <div className="text-3xl font-heading font-black text-success drop-shadow-md glow-text">{result.ats_score_estimate_after}</div>
                      </div>
                    </div>
                    <div className="text-center sm:text-right whitespace-nowrap">
                      <span className="text-primary font-bold text-[10px] uppercase tracking-widest">ATS Match Score</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-background border border-border rounded-lg p-5 relative group hover:border-primary/50 transition-colors">
                      <button onClick={() => handleCopy(result.headline, 'headline')} className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition p-1.5 rounded-md hover:bg-muted">
                        {copiedSection === 'headline' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <div className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-2">Optimized Headline</div>
                      <p className="font-semibold text-foreground text-lg leading-snug pr-8">{result.headline}</p>
                    </div>

                    <div className="bg-background border border-border rounded-lg p-5 relative group hover:border-primary/50 transition-colors">
                      <button onClick={() => handleCopy(result.about, 'about')} className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition p-1.5 rounded-md hover:bg-muted">
                        {copiedSection === 'about' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <div className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-2">Optimized Summary</div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-8">{result.about}</p>
                    </div>

                    <div className="bg-background border border-border rounded-lg p-5">
                      <div className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-3 text-glow">Keywords Injected</div>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords_added.map(k => (
                           <span key={k} className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded text-xs font-semibold">{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
