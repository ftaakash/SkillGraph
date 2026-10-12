import type { ReactNode } from "react";
import Link from "next/link";
import SkillGraphLogo from "@/components/SkillGraphLogo";

/** Shared shell for the small public account pages (forgot/reset password, verify email). */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 pinstripe-pattern">
      <main className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <Link href="/" aria-label="SkillGraph home"><SkillGraphLogo /></Link>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground text-center mb-6">{subtitle}</p>}
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
