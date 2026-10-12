"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Data export and account deletion (right to access / right to erasure). */
export default function PrivacyPanel() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true); setError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm: typed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete your account.");
        setDeleting(false);
        return;
      }
      await signOut({ redirect: false });
      window.location.href = "/login?reason=deleted";
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-6" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="font-heading text-base font-semibold text-foreground">Privacy &amp; data</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Download everything SkillGraph holds about you, or permanently delete your account. See our{" "}
        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
          <a href="/api/users/me/export" download><Download size={14} /> Download my data</a>
        </Button>
        {!confirming && (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)} className="text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 size={14} /> Delete account
          </Button>
        )}
      </div>

      {confirming && (
        <form onSubmit={deleteAccount} className="mt-4 space-y-3 border border-destructive/30 rounded-md p-4 bg-destructive/5">
          <p className="text-xs text-foreground">
            This permanently deletes your profile, résumés, sprints, applications and all related data. It cannot be undone.
          </p>
          <div>
            <label htmlFor="delete-password" className="text-xs font-medium text-foreground block mb-1">Password</label>
            <Input id="delete-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="bg-background" />
          </div>
          <div>
            <label htmlFor="delete-confirm" className="text-xs font-medium text-foreground block mb-1">Type DELETE to confirm</label>
            <Input id="delete-confirm" required value={typed} onChange={e => setTyped(e.target.value)} className="bg-background" autoComplete="off" />
          </div>
          {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={deleting || typed !== "DELETE" || !password} className="text-xs">
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setConfirming(false); setError(""); }} className="text-xs">Cancel</Button>
          </div>
        </form>
      )}
    </section>
  );
}
