"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPassword() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) router.push("/login?reason=reset");
      else setError(data.error ?? "Could not reset your password.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (token === null) {
    return (
      <AuthCard title="Reset link missing" subtitle="Open the link from your email, or request a new one.">
        <p className="text-center text-sm"><Link href="/forgot-password" className="text-primary hover:underline font-medium">Request a new link</Link></p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="This will sign you out on every device.">
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden />
          <label htmlFor="password" className="sr-only">New password</label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="New password (min. 8 characters)" className="pl-10 bg-muted border-border" />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden />
          <label htmlFor="confirm" className="sr-only">Confirm new password</label>
          <Input id="confirm" type="password" autoComplete="new-password" minLength={8} required value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" className="pl-10 bg-muted border-border" />
        </div>
        {error && <div role="alert" className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</div>}
        <Button type="submit" disabled={saving} className="w-full gradient-primary text-primary-foreground font-semibold">
          {saving ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Choose a new password" />}>
      <ResetPassword />
    </Suspense>
  );
}
