"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, RefreshCw, GraduationCap, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import NetworkBackground from "@/components/NetworkBackground";
import PageTransition from "@/components/PageTransition";

const roles = [
  { key: "STUDENT" as const, label: "Student", icon: GraduationCap, desc: "I'm looking for jobs & want to upskill" },
  { key: "FACULTY" as const, label: "Faculty / T&P", icon: Building2, desc: "I manage campus placements" },
  { key: "RECRUITER" as const, label: "Recruiter", icon: Briefcase, desc: "I'm hiring talent for my company" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "FACULTY" | "RECRUITER">("STUDENT");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    branch: "CSE",
    year: "3rd",
    targetRole: "Industrial AI Engineer",
  });

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (selectedRole === "STUDENT") router.push("/onboard");
      else if (selectedRole === "FACULTY") router.push("/faculty/dashboard");
      else router.push("/recruiter/talent");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative flex items-center justify-center pinstripe-pattern">
        <NetworkBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-lg p-8"
        >
          <div className="bg-card border border-border rounded-lg p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex justify-center mb-8">
              <SkillGraphLogo className="scale-110" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
              Join the Floor
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Select your role to get started
            </p>

            {/* Role Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {roles.map((r) => {
                const active = selectedRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)]"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    <r.icon size={20} />
                    <span className="text-xs font-semibold">{r.label}</span>
                    {active && (
                      <motion.div
                        layoutId="role-indicator"
                        className="absolute -bottom-px left-2 right-2 h-0.5 bg-primary rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-6 italic">
              {roles.find((r) => r.key === selectedRole)?.desc}
            </p>

            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="relative">
                <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary"
                  required
                />
              </div>

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !form.name || !form.email || !form.password}
                className="w-full gradient-primary text-primary-foreground font-semibold glow-primary mt-4 group"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create {selectedRole === "STUDENT" ? "Student" : selectedRole === "FACULTY" ? "Faculty" : "Recruiter"} Account
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already on the floor?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
