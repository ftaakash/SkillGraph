"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, GraduationCap, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import NetworkBackground from "@/components/NetworkBackground";
import PageTransition from "@/components/PageTransition";

const roles = [
  { key: "STUDENT" as const, label: "Student", icon: GraduationCap },
  { key: "FACULTY" as const, label: "Faculty", icon: Building2 },
  { key: "RECRUITER" as const, label: "Recruiter", icon: Briefcase },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "FACULTY" | "RECRUITER">("STUDENT");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }
    // Route based on selection (actual role is derived from DB, this is UX guidance)
    if (selectedRole === "FACULTY") router.push("/faculty/dashboard");
    else if (selectedRole === "RECRUITER") router.push("/recruiter/talent");
    else router.push("/dashboard");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative flex items-center justify-center pinstripe-pattern">
        <NetworkBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md p-8"
        >
          <div className="bg-card border border-border rounded-lg p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex justify-center mb-8">
              <SkillGraphLogo className="scale-110" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
              Welcome Back
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              The floor is open. Sign in to resume.
            </p>

            {/* Role Tabs */}
            <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-lg border border-border">
              {roles.map((r) => {
                const active = selectedRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      active
                        ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <r.icon size={14} />
                    {r.label}
                  </button>
                );
              })}
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                  required
                />
              </div>

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full gradient-primary text-primary-foreground font-semibold glow-primary mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                ) : null}
                Sign In <ArrowRight className="ml-2" size={16} />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Join the Floor
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
