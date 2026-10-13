"use client";

import { useState } from "react";
import { Link2, RefreshCw, Unlink, ShieldCheck } from "lucide-react";
import type { AcademicOverview } from "@/lib/academics/sync";

const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** Connect, resync or disconnect the student's university record. */
export default function ConnectPanel({ data, onChanged }: { data: AcademicOverview; onChanged: () => Promise<void> }) {
  const providers = data.providers;
  const connection = data.connection;
  const [provider, setProvider] = useState<string>(providers[0]?.id ?? "");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [deleteData, setDeleteData] = useState(false);

  const chosen = providers.find(p => p.id === provider);
  const needsReauth = connection?.status === "needs_reauth";

  const call = async (kind: "connect" | "sync" | "disconnect") => {
    setBusy(kind);
    setMessage(null);
    try {
      const res =
        kind === "connect"
          ? await fetch("/api/academics/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider, login: login || undefined, password: password || undefined, consent }),
            })
          : kind === "sync"
            ? await fetch("/api/academics/sync", { method: "POST" })
            : await fetch(`/api/academics/connect${deleteData ? "?deleteData=1" : ""}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: body.error ?? "Something went wrong. Try again." });
      } else if (kind === "sync" && body.synced === false) {
        setMessage({ tone: "ok", text: body.reason });
      } else {
        setMessage({ tone: "ok", text: kind === "disconnect" ? "Disconnected." : "Your record is up to date." });
      }
      setPassword("");
      await onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Link2 size={16} className="text-primary" />
        <h3 className="font-heading font-semibold text-foreground">University connection</h3>
      </div>

      {connection && !needsReauth ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Connected {connection.externalId ? <>as <span className="text-foreground">{connection.externalId}</span> </> : null}
            via {providers.find(p => p.id === connection.provider)?.label ?? connection.provider}.
            {connection.lastSyncAt ? ` Last synced ${when.format(new Date(connection.lastSyncAt))}.` : " Not synced yet."}
          </p>
          {connection.status === "error" && connection.lastError && (
            <p className="text-sm text-amber-400 mb-4" role="status">Last sync failed: {connection.lastError}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => call("sync")}
              disabled={busy !== null}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw size={14} className={busy === "sync" ? "animate-spin" : ""} /> Sync now
            </button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={deleteData} onChange={e => setDeleteData(e.target.checked)} />
              Also delete synced data
            </label>
            <button
              onClick={() => call("disconnect")}
              disabled={busy !== null}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            >
              <Unlink size={14} /> Disconnect
            </button>
          </div>
        </>
      ) : providers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Direct university sync isn&apos;t available yet. Until it is, your attendance and marks come from your college&apos;s
          placement cell, which can import them into SkillGraph.
        </p>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            void call("connect");
          }}
          className="space-y-4 mt-3"
        >
          {needsReauth && (
            <p className="text-sm text-amber-400" role="status">Your university session expired. Sign in again to keep syncing.</p>
          )}
          {providers.length > 1 && (
            <div>
              <label htmlFor="provider" className="block text-xs font-medium text-muted-foreground mb-1.5">Connect using</label>
              <select
                id="provider"
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full rounded-md bg-muted border border-border text-sm p-2.5"
              >
                {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}
          {chosen?.needsPassword ? (
            <>
              <div>
                <label htmlFor="login" className="block text-xs font-medium text-muted-foreground mb-1.5">University login</label>
                <input
                  id="login"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  autoComplete="username"
                  placeholder="ab1234@srmist.edu.in"
                  className="w-full rounded-md bg-muted border border-border text-sm p-2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">University password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-md bg-muted border border-border text-sm p-2.5"
                  required
                />
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                Your password is used once to sign in and is never stored. SkillGraph keeps only the encrypted portal session, and you can disconnect at any time.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              SkillGraph reads your record from the university using your verified university email. No password needed.
            </p>
          )}
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" required />
            <span>I allow SkillGraph to read my attendance, marks and timetable from my university and show them to me and my college&apos;s placement cell.</span>
          </label>
          <button
            type="submit"
            disabled={busy !== null || !consent}
            className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {busy === "connect" ? "Connecting…" : needsReauth ? "Sign in again" : "Connect"}
          </button>
        </form>
      )}

      {message && (
        <p className={`text-sm mt-4 ${message.tone === "error" ? "text-red-400" : "text-emerald-400"}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
