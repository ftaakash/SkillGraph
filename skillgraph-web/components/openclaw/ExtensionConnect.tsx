"use client";

import { useEffect, useState } from "react";
import { Puzzle, Copy, Check, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = { connected: boolean; connectedAt: string | null; expiresAt: string | null };

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

/** Connects the OpenClaw browser extension (ADR-004) with a revocable token, shown once. */
export default function ExtensionConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/extension/connect")
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStatus(d))
      .catch(() => {});
  }, []);

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/extension/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error);
      setToken(data.token);
      setStatus({ connected: true, connectedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString() });
    } catch (err) {
      setError((err as Error).message || "Could not create a token. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/extension/connect", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToken("");
      setStatus({ connected: false, connectedAt: null, expiresAt: null });
    } catch {
      setError("Could not disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(token).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <Puzzle size={16} className="text-primary" /> Browser extension
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        On LinkedIn, Naukri, Glassdoor and Superset job pages, the extension checks the job against your filters, tailors your
        résumé to it and fills the application form. You review it and press Submit. SkillGraph never gets your passwords or
        logins for those sites.
      </p>

      {token ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Your extension token (shown once):</p>
          <div className="flex gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-[11px]">{token}</code>
            <Button size="sm" variant="outline" onClick={copy} aria-label="Copy token">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Paste it into the extension’s popup. It works for 30 days. Creating a new one disconnects the old one.</p>
        </div>
      ) : (
        <p className="mt-3 text-xs">
          {status?.connected
            ? <span className="text-emerald-400">Connected since {fmt(status.connectedAt)} · expires {fmt(status.expiresAt)}</span>
            : <span className="text-muted-foreground">Not connected.</span>}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={connect} disabled={busy}>
          {status?.connected ? "Create a new token" : "Connect extension"}
        </Button>
        {status?.connected && (
          <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
            <Unplug size={14} className="mr-1.5" /> Disconnect
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Install: load the <code>extension/</code> folder of the SkillGraph repository in <code>chrome://extensions</code> (Developer mode → Load unpacked).
      </p>
    </div>
  );
}
