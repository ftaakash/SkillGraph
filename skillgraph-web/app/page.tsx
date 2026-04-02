"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Target, TrendingUp, Zap, BarChart3, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import WallStreetVideo from "@/components/WallStreetVideo";
import PageTransition from "@/components/PageTransition";

const stats = [
  { value: "12,400+", label: "Skills Mapped", icon: Sparkles },
  { value: "3,200+", label: "Gaps Closed", icon: Target },
  { value: "850+", label: "Active Employees", icon: Users },
];

const features = [
  {
    icon: Zap,
    title: "AI Sprint Planner",
    desc: "7-day high-intensity sprints. Close skill gaps like closing deals.",
  },
  {
    icon: BarChart3,
    title: "Benchmark Yourself",
    desc: "See where you rank on the curve. Know your position on the floor.",
  },
  {
    icon: TrendingUp,
    title: "Market Intelligence",
    desc: "Real-time demand index. Learn the hottest skills before anyone else.",
  },
];

const LandingPage = () => (
  <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      <WallStreetVideo />

      {/* Ticker tape */}
      <div className="relative z-10 bg-card/80 border-b border-border overflow-hidden">
        <div className="animate-ticker whitespace-nowrap py-1.5 text-xs font-body text-muted-foreground">
          <span className="mx-8">REACT ▲ +12.4%</span>
          <span className="mx-8">TYPESCRIPT ▲ +8.2%</span>
          <span className="mx-8">KUBERNETES ▲ +15.1%</span>
          <span className="mx-8">AI/ML ▲ +22.7%</span>
          <span className="mx-8">RUST ▲ +18.3%</span>
          <span className="mx-8">AWS ▲ +9.6%</span>
          <span className="mx-8">GRAPHQL ▼ -4.1%</span>
          <span className="mx-8">DOCKER ▲ +6.8%</span>
          <span className="mx-8">SYSTEM DESIGN ▲ +11.2%</span>
          <span className="mx-8">NODE.JS ▲ +5.4%</span>
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/50 backdrop-blur-sm">
        <SkillGraphLogo />
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="gradient-primary text-primary-foreground font-semibold px-6 glow-primary">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
            <DollarSign size={14} />
            The Floor Is Open
          </span>
          <h1 className="font-heading text-5xl md:text-7xl font-bold leading-tight tracking-tight text-foreground">
            Master the Market.
            <br />
            <span className="text-primary text-glow">Own Your Career.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload your resume. Let AI analyze your skill portfolio. Get a personalized
            playbook to become the asset every firm wants on their floor.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6 text-base glow-primary">
                Get Started <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted px-8 py-6 text-base">
                I Have an Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6 text-center hover:gold-border transition-colors"
            >
              <s.icon className="mx-auto text-primary mb-3" size={24} />
              <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24">
        <h2 className="font-heading text-3xl font-bold text-center text-foreground mb-12">
          Your Career, <span className="text-primary">Leveraged</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 hover:border-primary/40 hover:glow-primary transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-primary mb-4 group-hover:bg-primary/10 transition-colors">
                <f.icon size={24} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-sm text-muted-foreground pinstripe-pattern">
        © 2026 SkillGraph. Fortune favors the prepared.
      </footer>
    </div>
  </PageTransition>
);

export default LandingPage;
