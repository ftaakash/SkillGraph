"use client";

import { Bot, Zap, Pause, Play, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentStatusCardProps {
  isActive: boolean;
  appliedToday: number;
  dailyLimit: number;
  totalApplications: number;
  avgMatchScore: number;
  onToggle: () => void;
}

export default function AgentStatusCard({
  isActive,
  appliedToday,
  dailyLimit,
  totalApplications,
  avgMatchScore,
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
              <h2 className="font-heading text-lg font-bold text-foreground">OpenClaw Agent</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                }`} />
                <span className={`text-xs font-semibold ${
                  isActive ? "text-green-500" : "text-muted-foreground"
                }`}>
                  {isActive ? "ACTIVE — Hunting Jobs" : "PAUSED"}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={onToggle}
            variant={isActive ? "destructive" : "default"}
            size="sm"
            className={!isActive ? "gradient-primary text-primary-foreground glow-primary" : ""}
          >
            {isActive ? <><Pause size={14} className="mr-1.5" /> Pause</> : <><Play size={14} className="mr-1.5" /> Activate</>}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-background/50 rounded-lg p-3 text-center border border-border">
            <div className="text-2xl font-heading font-black text-foreground">{appliedToday}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Today / {dailyLimit}</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className="gradient-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((appliedToday / dailyLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center border border-border">
            <div className="text-2xl font-heading font-black text-foreground">{totalApplications}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Total Applied</div>
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
