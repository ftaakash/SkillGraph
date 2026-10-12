"use client";

import { Bot, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentStatusCardProps {
  isActive: boolean;
  preparedToday: number;
  readyToApply: number;
  dailyLimit: number;
  totalApplications: number;
  avgMatchScore: number;
  running?: boolean;
  onToggle: () => void;
}

export default function AgentStatusCard({
  isActive,
  preparedToday,
  readyToApply,
  dailyLimit,
  totalApplications,
  avgMatchScore,
  running = false,
  onToggle,
}: AgentStatusCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm relative overflow-hidden">
      {/* Animated background pulse when active */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent animate-pulse-glow pointer-events-none" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isActive ? "gradient-primary glow-primary" : "bg-muted"
            }`}>
              <Bot size={20} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">OpenClaw Assistant</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                }`} />
                <span className={`text-xs font-semibold ${
                  isActive ? "text-green-500" : "text-muted-foreground"
                }`}>
                  {running ? "RUNNING — Evaluating matches" : isActive ? "ACTIVE — Prepares matches nightly" : "PAUSED"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Finds roles, scores fit and tailors your résumé. You review and submit every application yourself.
              </p>
            </div>
          </div>
          <Button
            onClick={onToggle}
            disabled={running}
            variant={isActive ? "destructive" : "default"}
            size="sm"
            className={!isActive ? "gradient-primary text-primary-foreground glow-primary" : ""}
          >
            {running ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Running</>
              : isActive ? <><Pause size={14} className="mr-1.5" /> Pause</>
              : <><Play size={14} className="mr-1.5" /> Activate</>}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-background/50 rounded-lg p-3 text-center border border-border">
            <div className="text-2xl font-heading font-black text-foreground">{readyToApply}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Ready to apply</div>
            <div className="text-[10px] text-muted-foreground mt-1">{preparedToday} / {dailyLimit} prepared today</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                className="gradient-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((preparedToday / Math.max(dailyLimit, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center border border-border">
            <div className="text-2xl font-heading font-black text-foreground">{totalApplications}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">In pipeline</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center border border-border">
            <div className="text-2xl font-heading font-black text-primary">{avgMatchScore}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Avg Match</div>
          </div>
        </div>
      </div>
    </div>
  );
}
