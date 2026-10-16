"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings2, MapPin, Briefcase, Ban, Gauge, Save, RefreshCw, Tags, Send } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import AgentStatusCard from "@/components/openclaw/AgentStatusCard";
import ApplicationFeed from "@/components/openclaw/ApplicationFeed";
import AgentChatConsole from "@/components/openclaw/AgentChatConsole";
import PipelineDashboard from "@/components/openclaw/PipelineDashboard";
import StoryBankPanel from "@/components/openclaw/StoryBankPanel";
import ExtensionConnect from "@/components/openclaw/ExtensionConnect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OpenClawConfig {
  id: string;
  targetRoles: string[];
  preferredCities: string[];
  minCtcLpa: number;
  dailyLimit: number;
  blacklistedCompanies: string[];
  isActive: boolean;
  applicationEmail?: string | null;
  phone?: string | null;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  autoSubmit?: boolean;
}

const csv = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

interface AppStats {
  total: number;
  preparedToday: number;
  handledToday?: number;
  readyToApply: number;
  avgMatchScore: number;
}

export default function OpenClawPage() {
  const [config, setConfig] = useState<OpenClawConfig | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState<AppStats>({ total: 0, preparedToday: 0, readyToApply: 0, avgMatchScore: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");

  // Editable form state
  const [targetRoles, setTargetRoles] = useState("");
  const [preferredCities, setPreferredCities] = useState("");
  const [minCtcLpa, setMinCtcLpa] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [blacklisted, setBlacklisted] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [autoSubmit, setAutoSubmit] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      fetch("/api/openclaw/config").then(r => r.json()),
      fetch("/api/openclaw/applications").then(r => r.json()),
    ]).then(([configData, appData]) => {
      const cfg = configData.config;
      if (cfg) {
        setConfig(cfg);
        setTargetRoles((cfg.targetRoles as string[]).join(", "));
        setPreferredCities((cfg.preferredCities as string[]).join(", "));
        setMinCtcLpa(cfg.minCtcLpa);
        setDailyLimit(cfg.dailyLimit);
        setBlacklisted((cfg.blacklistedCompanies as string[]).join(", "));
        setApplicationEmail(cfg.applicationEmail || "");
        setPhone(cfg.phone || "");
        setIncludeKeywords((cfg.includeKeywords ?? []).join(", "));
        setExcludeKeywords((cfg.excludeKeywords ?? []).join(", "));
        setAutoSubmit(Boolean(cfg.autoSubmit));
      }
      setApplications(appData.applications ?? []);
      setStats(appData.stats ?? { total: 0, preparedToday: 0, readyToApply: 0, avgMatchScore: 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { 
    loadData();
    // Poll for updates every 15 seconds to reflect background agent applications
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      targetRoles: csv(targetRoles),
      preferredCities: csv(preferredCities),
      minCtcLpa,
      dailyLimit,
      blacklistedCompanies: csv(blacklisted),
      includeKeywords: csv(includeKeywords),
      excludeKeywords: csv(excludeKeywords),
      autoSubmit,
      isActive: config?.isActive ?? false,
      applicationEmail: applicationEmail.trim(),
      phone: phone.trim(),
    };

    try {
      const res = await fetch("/api/openclaw/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(data.config);
        setAgentMessage("Preferences saved.");
      } else {
        setAgentMessage(data.error ?? "Could not save preferences.");
      }
    } catch {
      setAgentMessage("Network error. Your preferences were not saved.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = async () => {
    const isActivating = !config?.isActive;
    const payload = { isActive: isActivating };
    const res = await fetch("/api/openclaw/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setAgentMessage(data.error ?? "Could not update the agent.");
      return;
    }
    setConfig(data.config);

    // Active = the nightly run prepares matches; also run once now for immediate results
    if (isActivating) {
      setRunning(true);
      setAgentMessage("Finding and evaluating matching roles…");
      try {
        const runRes = await fetch("/api/openclaw/trigger", { method: "POST" });
        const run = await runRes.json();
        setAgentMessage(run.message ?? run.error ?? "Run finished.");
        loadData();
      } catch {
        setAgentMessage("The run failed. Please try again.");
      } finally {
        setRunning(false);
      }
    } else {
      setAgentMessage("");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="OpenClaw Agent">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PageTransition>
      <DashboardLayout title="OpenClaw Agent">
        {/* Agent Status */}
        <div className="mb-6">
          <AgentStatusCard
            isActive={config?.isActive ?? false}
            handledToday={stats.handledToday ?? stats.preparedToday}
            readyToApply={stats.readyToApply}
            dailyLimit={config?.dailyLimit ?? 10}
            totalApplications={stats.total}
            avgMatchScore={stats.avgMatchScore}
            running={running}
            onToggle={toggleAgent}
          />
          {agentMessage && (
            <p role="status" className="mt-2 text-xs text-muted-foreground px-1">{agentMessage}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Config Panel — Left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-primary" /> Agent Configuration
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Briefcase size={12} /> Target Roles
                  </label>
                  <Input
                    value={targetRoles}
                    onChange={e => setTargetRoles(e.target.value)}
                    placeholder="SDE, Full Stack, ML Engineer"
                    className="bg-muted border-border text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <MapPin size={12} /> Preferred Cities
                  </label>
                  <Input
                    value={preferredCities}
                    onChange={e => setPreferredCities(e.target.value)}
                    placeholder="Bangalore, Hyderabad, Remote"
                    className="bg-muted border-border text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Application Email</label>
                    <Input
                      type="email"
                      value={applicationEmail}
                      onChange={e => setApplicationEmail(e.target.value)}
                      placeholder="Email for recruiter responses"
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Phone Number</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                      <Gauge size={12} /> Min CTC (LPA)
                    </label>
                    <Input
                      type="number"
                      value={minCtcLpa}
                      onChange={e => setMinCtcLpa(parseFloat(e.target.value) || 0)}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Daily Limit</label>
                    <Input
                      type="number"
                      value={dailyLimit}
                      onChange={e => setDailyLimit(parseInt(e.target.value) || 10)}
                      min={1}
                      max={25}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Ban size={12} /> Blacklisted Companies
                  </label>
                  <Input
                    value={blacklisted}
                    onChange={e => setBlacklisted(e.target.value)}
                    placeholder="Optional — comma-separated"
                    className="bg-muted border-border text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Tags size={12} /> Must mention (any of)
                  </label>
                  <Input
                    value={includeKeywords}
                    onChange={e => setIncludeKeywords(e.target.value)}
                    placeholder="Optional — e.g. React, Python, fresher"
                    className="bg-muted border-border text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Ban size={12} /> Skip jobs mentioning
                  </label>
                  <Input
                    value={excludeKeywords}
                    onChange={e => setExcludeKeywords(e.target.value)}
                    placeholder="Optional — e.g. 5+ years, bond, unpaid"
                    className="bg-muted border-border text-sm"
                  />
                </div>

                <label className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSubmit}
                    onChange={e => setAutoSubmit(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-xs leading-relaxed">
                    <span className="font-semibold text-foreground flex items-center gap-1"><Send size={12} /> Submit for me where the employer allows it</span>
                    <span className="text-muted-foreground">
                      For employers that have connected their hiring system to SkillGraph, OpenClaw submits your tailored résumé and profile for jobs that pass your filters.
                      Everything else waits for you to submit, with the browser extension or by hand. If a form asks a question only you can answer, it waits for you.
                    </span>
                  </span>
                </label>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full gradient-primary text-primary-foreground font-semibold glow-primary mt-2"
                >
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save size={14} className="mr-2" />}
                  Save Configuration
                </Button>
              </div>
            </div>

            <ExtensionConnect />
          </div>

          {/* Activity Feed, Chat, Pipeline & Stories — Right */}
          <div className="lg:col-span-3 h-[700px] flex flex-col">
            <Tabs defaultValue="pipeline" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1 h-12 shrink-0 mb-4">
                <TabsTrigger value="pipeline" className="rounded-md h-full data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 font-medium text-xs">⚡ Pipeline</TabsTrigger>
                <TabsTrigger value="stories" className="rounded-md h-full data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 font-medium text-xs">📖 Stories</TabsTrigger>
                <TabsTrigger value="feed" className="rounded-md h-full data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 font-medium text-xs">Applications</TabsTrigger>
                <TabsTrigger value="advisor" className="rounded-md h-full data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 font-medium text-xs">Advisor</TabsTrigger>
              </TabsList>
              <TabsContent value="pipeline" className="flex-1 mt-0 outline-none overflow-hidden">
                <PipelineDashboard />
              </TabsContent>
              <TabsContent value="stories" className="flex-1 mt-0 outline-none overflow-hidden">
                <StoryBankPanel />
              </TabsContent>
              <TabsContent value="feed" className="flex-1 mt-0 outline-none">
                <ApplicationFeed applications={applications} />
              </TabsContent>
              <TabsContent value="advisor" className="flex-1 mt-0 outline-none">
                <AgentChatConsole />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
