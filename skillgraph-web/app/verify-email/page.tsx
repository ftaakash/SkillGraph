"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";

type State = { kind: "working" } | { kind: "done" } | { kind: "error"; message: string };

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(
    token ? { kind: "working" } : { kind: "error", message: "This verification link is incomplete." }
  );

  useEffect(() => {
    if (!token) return;
    // A POST (not the GET of the emailed link) consumes the token, so email link scanners can't burn it
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json();
        setState(res.ok ? { kind: "done" } : { kind: "error", message: data.error ?? "Verification failed." });
      })
      .catch(() => setState({ kind: "error", message: "Network error. Please reload the page." }));
  }, [token]);

  if (state.kind === "working") return <AuthCard title="Verifying your email…" subtitle="One moment." />;
  if (state.kind === "done") {
    return (
      <AuthCard title="Email verified" subtitle="Thanks, your email address is confirmed.">
        <p className="text-center text-sm"><Link href="/dashboard" className="text-primary hover:underline font-medium">Continue to SkillGraph</Link></p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Could not verify your email" subtitle={state.message}>
      <p className="text-center text-sm text-muted-foreground">
        Sign in and use <span className="font-medium text-foreground">Resend verification email</span> on your profile page.
      </p>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="Verifying your email…" subtitle="One moment." />}>
      <VerifyEmail />
    </Suspense>
  );
}
