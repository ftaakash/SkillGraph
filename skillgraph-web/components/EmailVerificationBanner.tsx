"use client";

import { useEffect, useState } from "react";
import { MailWarning } from "lucide-react";

const DISMISS_KEY = "sg-verify-banner-dismissed";
// Verification never reverts, so once seen verified this tab skips the profile request on every page
const VERIFIED_KEY = "sg-email-verified";

/** Reminds signed-in users with an unverified email address and lets them resend the link. */
export default function EmailVerificationBanner() {
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) || sessionStorage.getItem(VERIFIED_KEY)) return;
    } catch { /* storage unavailable */ }
    fetch("/api/users/me")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.user) return;
        if (d.user.emailVerifiedAt) {
          try { sessionStorage.setItem(VERIFIED_KEY, "1"); } catch { /* storage unavailable */ }
        } else {
          setEmail(d.user.email);
        }
      })
      .catch(() => {});
  }, []);

  if (!email) return null;

  const resend = async () => {
    setState("sending");
    const res = await fetch("/api/auth/verify-email/resend", { method: "POST" }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setEmail(null);
  };

  return (
    <div role="status" className="mx-8 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <MailWarning size={16} className="text-amber-500 shrink-0" aria-hidden />
      <span className="text-foreground">
        Please verify <span className="font-medium">{email}</span> so we can reach you about password resets and recruiter requests.
      </span>
      <div className="ml-auto flex items-center gap-3">
        {state === "sent" ? (
          <span className="text-xs text-muted-foreground">Link sent — check your inbox.</span>
        ) : (
          <button onClick={resend} disabled={state === "sending"} className="text-xs font-semibold text-primary hover:underline disabled:opacity-60">
            {state === "sending" ? "Sending…" : state === "error" ? "Retry sending" : "Resend verification email"}
          </button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
    </div>
  );
}
