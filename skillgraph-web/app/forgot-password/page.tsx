"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) setMessage(data.message);
      else setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthCard title="Reset your password" subtitle="Enter your account email and we will send you a reset link.">
      {message ? (
        <div role="status" className="text-sm bg-primary/10 border border-primary/20 px-3 py-3 rounded-lg text-foreground">{message}</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden />
            <label htmlFor="email" className="sr-only">Email address</label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" className="pl-10 bg-muted border-border" />
          </div>
          {error && <div role="alert" className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</div>}
          <Button type="submit" disabled={sending || !email} className="w-full gradient-primary text-primary-foreground font-semibold">
            {sending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
