"use client";
import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard = ({ icon, label, value, trend, trendUp }: StatCardProps) => (
  <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
    <div className="flex items-start justify-between">
      <div className="p-2 rounded-lg bg-muted text-primary group-hover:glow-primary transition-shadow">
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
        }`}>
          {trend}
        </span>
      )}
    </div>
    <p className="mt-4 text-2xl font-heading font-bold text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

export default StatCard;

