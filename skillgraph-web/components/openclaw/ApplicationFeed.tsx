"use client";

import { ExternalLink, CheckCircle2, Clock, XCircle, Zap } from "lucide-react";

interface Listing {
  company: string;
  role: string;
  location: string | null;
  ctcBand: string | null;
  platform: string;
  sourceUrl: string;
  jdText: string;
}

interface Application {
  id: string;
  matchScore: number | null;
  status: string;
  appliedAt: string;
  tailoringNotes: string | null;
  listing: Listing | null;
}

interface ApplicationFeedProps {
  applications: Application[];
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  Applied: { icon: <CheckCircle2 size={14} />, color: "text-green-500" },
  Pending: { icon: <Clock size={14} />, color: "text-yellow-500" },
  Failed: { icon: <XCircle size={14} />, color: "text-destructive" },
  Matched: { icon: <Zap size={14} />, color: "text-primary" },
};

export default function ApplicationFeed({ applications }: ApplicationFeedProps) {
  if (applications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Zap size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No applications yet. Activate the agent and configure your preferences to start auto-applying.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-heading text-sm font-semibold text-foreground">Recent Activity</h3>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {applications.map((app) => {
          const { icon, color } = statusConfig[app.status] ?? statusConfig.Applied;
          return (
            <div key={app.id} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {app.listing?.sourceUrl ? (
                        <a href={app.listing.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline">
                          {app.listing?.role ?? "Unknown Role"}
                        </a>
                      ) : (
                        app.listing?.role ?? "Unknown Role"
                      )}
                    </h4>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
                      {icon} {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {app.listing?.company ?? "—"} · {app.listing?.location ?? "Remote"} · {app.listing?.ctcBand ?? "CTC undisclosed"} · <span className="font-semibold text-foreground/80">{app.listing?.platform ?? ""}</span>
                  </p>
                  {app.listing?.jdText && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">&quot;{app.listing.jdText}&quot;</p>
                  )}
                  {app.tailoringNotes && (
                    <div className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded inline-block mt-2 font-medium">Auto-tailored: {app.tailoringNotes}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {app.matchScore != null && (
                    <span className={`text-sm font-bold ${app.matchScore >= 80 ? "text-green-500" : app.matchScore >= 50 ? "text-primary" : "text-muted-foreground"}`}>
                      {app.matchScore}%
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {app.listing?.sourceUrl && (
                    <a
                      href={app.listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline mt-0.5"
                    >
                      View <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
