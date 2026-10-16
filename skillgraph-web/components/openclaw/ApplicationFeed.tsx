"use client";

import { ExternalLink, CheckCircle2, Clock, XCircle, Zap, Send } from "lucide-react";
import { statusLabel, recommendationLabel, submittedViaLabel, parseTailoringNotes } from "./labels";

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
  submittedVia?: string | null;
  resumeVersionId?: string | null;
  Listing?: Listing | null;
  listing?: Listing | null;
}

interface ApplicationFeedProps {
  applications: Application[];
}

const STATUS_STYLE: Record<string, { icon: React.ReactNode; color: string }> = {
  Pending: { icon: <Clock size={14} />, color: "text-yellow-500" },
  ReadyToApply: { icon: <Zap size={14} />, color: "text-primary" },
  Applied: { icon: <CheckCircle2 size={14} />, color: "text-green-500" },
  Shortlisted: { icon: <CheckCircle2 size={14} />, color: "text-green-400" },
  Interviewing: { icon: <CheckCircle2 size={14} />, color: "text-green-400" },
  Offer: { icon: <CheckCircle2 size={14} />, color: "text-green-300" },
  Rejected: { icon: <XCircle size={14} />, color: "text-destructive" },
  Failed: { icon: <XCircle size={14} />, color: "text-muted-foreground" },
  UnableToApply: { icon: <XCircle size={14} />, color: "text-muted-foreground" },
};
const DEFAULT_STYLE = { icon: <Clock size={14} />, color: "text-muted-foreground" };

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500/20 text-green-500",
  B: "bg-cyan-500/20 text-cyan-500",
  C: "bg-yellow-500/20 text-yellow-500",
  D: "bg-orange-500/20 text-orange-500",
  F: "bg-red-500/20 text-red-500",
};

export default function ApplicationFeed({ applications }: ApplicationFeedProps) {
  if (applications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Zap size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No applications yet. Save your filters and switch OpenClaw on: it tailors a résumé for each strong match, and submits
          for you where the employer allows it and you turned on auto-submit.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-heading text-sm font-semibold text-foreground">Recent activity</h3>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {applications.map((app) => {
          const { icon, color } = STATUS_STYLE[app.status] ?? DEFAULT_STYLE;
          const listing = app.Listing ?? app.listing ?? null;
          const { evaluation, advice, notSubmittedReason } = parseTailoringNotes(app.tailoringNotes);
          const via = app.status === "Applied" ? submittedViaLabel(app.submittedVia) : null;
          return (
            <div key={app.id} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {listing?.sourceUrl ? (
                        <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline">
                          {listing.role}
                        </a>
                      ) : (
                        listing?.role ?? "Unknown role"
                      )}
                    </h4>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
                      {icon} {statusLabel(app.status)}
                    </span>
                    {via && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        <Send size={10} /> {via}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[listing?.company, listing?.location, listing?.ctcBand ?? "CTC not disclosed", listing?.platform].filter(Boolean).join(" · ")}
                  </p>
                  {listing?.jdText && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed line-clamp-2">{listing.jdText}</p>
                  )}

                  {evaluation?.grade && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-950/50 border border-border/50 space-y-1.5">
                      <div className="flex gap-2 items-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${GRADE_COLORS[evaluation.grade] ?? "bg-primary/10 text-primary"}`}>
                          Grade {evaluation.grade}
                        </span>
                        {evaluation.recommendation && (
                          <span className="text-[10px] text-muted-foreground font-medium">{recommendationLabel(evaluation.recommendation)}</span>
                        )}
                      </div>
                      {evaluation.keyStrengths?.[0] && <p className="text-[10px] text-green-400 font-medium">✓ {evaluation.keyStrengths[0]}</p>}
                      {evaluation.keyWeaknesses?.[0] && <p className="text-[10px] text-red-400 font-medium">✗ {evaluation.keyWeaknesses[0]}</p>}
                    </div>
                  )}
                  {advice && (
                    <p className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded mt-2 leading-relaxed">
                      <span className="font-semibold">What to emphasise:</span> {advice}
                    </p>
                  )}
                  {notSubmittedReason && (
                    <p className="text-[11px] bg-amber-500/10 text-amber-300 px-2 py-1 rounded mt-1.5 leading-relaxed">
                      <span className="font-semibold">Not submitted for you:</span> {notSubmittedReason}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {app.matchScore != null && (
                    <span className={`text-sm font-bold ${app.matchScore >= 80 ? "text-green-500" : app.matchScore >= 50 ? "text-primary" : "text-muted-foreground"}`}>
                      {Math.round(app.matchScore)}%
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                  </p>
                  <div className="flex flex-col items-end gap-0.5 mt-0.5">
                    {listing?.sourceUrl && (
                      <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                        View <ExternalLink size={10} />
                      </a>
                    )}
                    {app.resumeVersionId && (
                      <a href={`/api/resume/download/${app.resumeVersionId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                        Tailored résumé
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
