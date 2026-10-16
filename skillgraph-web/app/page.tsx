"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Target, TrendingUp, Zap, Users, DollarSign, Bot, FileText, GraduationCap,
  Briefcase, Building2, UserSearch, SlidersHorizontal, Send, Puzzle, ShieldCheck, Lock, BadgeCheck, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import WallStreetVideo from "@/components/WallStreetVideo";
import PageTransition from "@/components/PageTransition";

// Live counts from /api/stats (cached at the CDN); nothing is shown until real numbers arrive
type LandingStats = { studentsAnalyzed: number; skillGapsFound: number; sprintsCompleted: number };
const STAT_CARDS = [
  { key: "studentsAnalyzed", label: "Students", icon: Users },
  { key: "skillGapsFound", label: "Skill Gaps Found", icon: Target },
  { key: "sprintsCompleted", label: "Sprints Completed", icon: Sparkles },
] as const;

function useLandingStats() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  useEffect(() => {
    fetch("/api/stats").then(r => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, []);
  return stats;
}

const TICKER_SKILLS = ["REACT", "TYPESCRIPT", "KUBERNETES", "AI/ML", "RUST", "AWS", "GRAPHQL", "DOCKER", "SYSTEM DESIGN", "NODE.JS"];

const FEATURES = [
  {
    icon: Bot,
    title: "Smart Apply",
    desc: "Set your roles, cities, pay and keywords. Smart Apply finds matching jobs, tailors your résumé to each one, and submits where the employer allows it.",
    tag: "New",
  },
  {
    icon: Target,
    title: "Skill Gaps & 7-Day Sprints",
    desc: "See what recent postings for your target role ask for that you don't have yet, then close the gaps with a day-by-day learning plan.",
  },
  {
    icon: FileText,
    title: "Résumé Builder",
    desc: "Drafts tailored to any job description, built only from your real experience. ATS score, section-by-section AI polish and PDF export.",
  },
  {
    icon: GraduationCap,
    title: "Academics & Attendance",
    desc: "Know exactly how many classes to attend, or can still miss, to stay above 75%. Marks, timetable and your next class at a glance.",
  },
  {
    icon: Briefcase,
    title: "Placement Drives",
    desc: "Every campus drive with eligibility and deadlines, each hiring round as it happens, check-in at the venue, a calendar, notices and drive chats.",
  },
  {
    icon: TrendingUp,
    title: "Market & Benchmark",
    desc: "Skill demand from this week's job postings, how it moved since last week, and where your readiness sits against students aiming for the same role.",
  },
] as const;

const OPENCLAW_STEPS = [
  { icon: SlidersHorizontal, title: "Set your filters", desc: "Target roles, cities or remote, minimum CTC, companies to avoid, keywords to require or skip." },
  { icon: FileText, title: "Get a tailored résumé", desc: "For every match, a résumé rebuilt from yours for that job. Nothing invented." },
  { icon: Send, title: "Apply in one step", desc: "Auto-submitted where employers connect to SkillGraph. Everywhere else, the browser extension fills the form and you press Submit." },
] as const;

const AUDIENCES = [
  {
    icon: Building2,
    title: "For placement cells",
    points: [
      "Your own college workspace: students join with a code",
      "Drives, hiring rounds, check-in codes and bulk results",
      "Import drives, attendance and marks from CSV",
      "Notices, drive chats, cohort analytics and reports",
    ],
  },
  {
    icon: UserSearch,
    title: "For recruiters",
    points: [
      "Discover opted-in students by skills, not by name",
      "Shortlist and track candidates in a pipeline",
      "Contact details shared only when the student accepts",
      "Free to start, Team plan for hiring teams",
    ],
  },
] as const;

const PROMISES = [
  { icon: Lock, text: "We never ask for your LinkedIn or Naukri password" },
  { icon: BadgeCheck, text: "AI never invents experience on your résumé" },
  { icon: ShieldCheck, text: "Your files stay private, with export and delete anytime" },
  { icon: Wallet, text: "Free to start; colleges can cover Pro for students" },
] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { delay, duration: 0.5, ease: "easeOut" as const },
});

const LandingPage = () => {
  const stats = useLandingStats();
  return (
  <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-screen">
        <WallStreetVideo />
      </div>

      {/* Ticker tape */}
      <div className="relative z-10 bg-card/80 border-b border-border overflow-hidden">
        <div className="animate-ticker whitespace-nowrap py-1.5 text-xs font-body text-muted-foreground">
          {TICKER_SKILLS.map(skill => <span key={skill} className="mx-8">{skill}</span>)}
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 border-b border-border/50 backdrop-blur-sm">
        <SkillGraphLogo />
        <div className="flex items-center gap-2 sm:gap-4">
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
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-24 pb-20 text-center">
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
            Find your skill gaps against what employers are hiring for, close them in 7-day sprints, stay on top of
            attendance and placement drives, and apply with a résumé tailored to every job.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
      {stats && (
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STAT_CARDS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6 text-center hover:gold-border transition-colors"
            >
              <s.icon className="mx-auto text-primary mb-3" size={24} />
              <p className="font-heading text-3xl font-bold text-foreground">{(stats[s.key] ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
      )}

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-24">
        <motion.div {...fadeUp()} className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Your Career, <span className="text-primary">Leveraged</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            One place for everything placement season asks of you, from the first skill gap to the final round.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(0.05 * i)}
              className="relative bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 hover:border-primary/40 hover:glow-primary transition-all group"
            >
              {"tag" in f && (
                <span className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/40 rounded-full px-2 py-0.5">
                  {f.tag}
                </span>
              )}
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-primary mb-4 group-hover:bg-primary/10 transition-colors">
                <f.icon size={24} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How Smart Apply works */}
      <section className="relative z-10 border-y border-border/60 bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
              <Bot size={14} /> Smart Apply
            </span>
            <h2 className="mt-3 font-heading text-3xl md:text-4xl font-bold text-foreground">
              Apply to the right jobs, <span className="text-primary">without the busywork</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {OPENCLAW_STEPS.map((s, i) => (
              <motion.div key={s.title} {...fadeUp(0.1 * i)} className="bg-background/70 border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-heading text-2xl font-bold text-primary">{i + 1}</span>
                  <s.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp(0.3)} className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground text-center">
            <Puzzle size={16} className="text-primary shrink-0" />
            The browser extension works on LinkedIn, Naukri, Glassdoor and Superset, inside your own browser.
          </motion.p>
        </div>
      </section>

      {/* Placement cells and recruiters */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <motion.h2 {...fadeUp()} className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
          Built for the <span className="text-primary">whole floor</span>
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          {AUDIENCES.map((a, i) => (
            <motion.div key={a.title} {...fadeUp(0.1 * i)} className="bg-card/80 border border-border rounded-lg p-8 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <a.icon size={22} />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">{a.title}</h3>
              </div>
              <ul className="space-y-3">
                {a.points.map(p => (
                  <li key={p} className="flex gap-3 text-sm text-muted-foreground">
                    <Zap size={14} className="text-primary mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Promises */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROMISES.map((p, i) => (
            <motion.div key={p.text} {...fadeUp(0.05 * i)} className="flex items-start gap-3 border border-border/70 rounded-lg p-4 bg-card/40">
              <p.icon size={18} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/90 leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 pb-24 text-center">
        <motion.div {...fadeUp()} className="border border-primary/30 rounded-2xl p-10 bg-gradient-to-b from-primary/10 to-transparent">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Placement season starts <span className="text-primary">now</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Upload your résumé and see your first skill gaps in under a minute.</p>
          <Link href="/register" className="inline-block mt-8">
            <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6 text-base glow-primary">
              Get Started Free <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-sm text-muted-foreground pinstripe-pattern">
        © 2026 SkillGraph. Fortune favors the prepared.
        <span className="mx-2" aria-hidden>·</span>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
        <span className="mx-2" aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
      </footer>
    </div>
  </PageTransition>
  );
};

export default LandingPage;
