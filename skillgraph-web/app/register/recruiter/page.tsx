"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Globe, Building, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import NetworkBackground from "@/components/NetworkBackground";
import PageTransition from "@/components/PageTransition";

export default function RecruiterRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    companyWebsite: "",
    tier: "MNC",
    hrEmail: "",
  });

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register/recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

      router.push("/recruiter/dashboard");
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
            <div className="flex justify-center mb-6">
              <SkillGraphLogo className="scale-110" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-1">
              Recruiter Registration
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Discover top engineering talent for your company
            </p>

            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="relative">
                <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Company Details</p>
              </div>

              <div className="relative">
                <Building className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>

              <div className="relative">
                <Globe className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input placeholder="Company website" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}
                  className="bg-muted border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="FAANG">FAANG / Big Tech</option>
                  <option value="Unicorn">Unicorn</option>
                  <option value="MNC">MNC</option>
                  <option value="Service">Service Company</option>
                  <option value="Startup">Startup</option>
                </select>
                <Input type="email" placeholder="HR contact email" value={form.hrEmail}
                  onChange={(e) => setForm({ ...form, hrEmail: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg font-medium">{error}</div>
              )}

              <Button type="submit" disabled={loading || !form.name || !form.email || !form.password || !form.companyName}
                className="w-full gradient-primary text-primary-foreground font-semibold glow-primary mt-4 group">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <>Create Recruiter Account <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
              </Button>
            </form>

            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground text-center">
              Your account will require verification before accessing the talent pool.
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already registered? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              {" · "}
              <Link href="/register" className="text-primary hover:underline font-medium">Student</Link>
              {" · "}
              <Link href="/register/faculty" className="text-primary hover:underline font-medium">Faculty</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
