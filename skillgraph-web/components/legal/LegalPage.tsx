import type { ReactNode } from "react";
import Link from "next/link";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import { TERMS_VERSION } from "@/lib/validation/auth";

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "privacy@skillgraph.app";

/** Long-form layout for the Terms and Privacy pages. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" aria-label="SkillGraph home"><SkillGraphLogo /></Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-2">Version {TERMS_VERSION}</p>
        <p className="text-xs text-muted-foreground mb-8 border border-border rounded-md px-3 py-2 bg-muted/40">
          This document describes how SkillGraph works today and is pending review by legal counsel.
        </p>
        <div className="space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}
