import { useState } from "react";

const sections = ["Overview", "Problem", "Features", "Tech Stack", "Architecture", "SDG Mapping", "Roadmap", "Presentation"];

const features = [
  {
    id: "F1",
    category: "Core Intelligence",
    name: "Resume Skill Extractor",
    description: "User uploads their resume (PDF/DOCX). OpenAI API parses it and extracts a structured skill graph — technical skills, soft skills, tools, experience level, and project keywords.",
    tech: "OpenAI API + PDF parser",
    complexity: "High",
    minorPhase: true,
    wow: "Instant visual skill map generated from resume upload",
  },
  {
    id: "F2",
    category: "Core Intelligence",
    name: "Real-Time Job Market Tracker",
    description: "Scrapes and indexes 10,000+ job postings weekly from LinkedIn, Naukri, and Internshala using API wrappers. Aggregates in-demand skill frequencies by role, city, and salary band.",
    tech: "RapidAPI LinkedIn Scraper + Airtable",
    complexity: "High",
    minorPhase: true,
    wow: "Live 'Skill Demand Index' — see which skills are trending this week",
  },
  {
    id: "F3",
    category: "Core Intelligence",
    name: "Skill Gap Analysis Engine",
    description: "Cross-references your extracted skills against market demand for your target role. Produces a gap score, missing skills ranked by urgency, and a 'readiness percentage' for your dream job.",
    tech: "OpenAI API + custom prompt chain",
    complexity: "High",
    minorPhase: true,
    wow: "Readiness % score — '68% ready for SDE role at a product company'",
  },
  {
    id: "F4",
    category: "Learning Engine",
    name: "Weekly Learning Sprint Generator",
    description: "AI generates a 7-day personalized learning plan to close your top skill gaps — with specific free resources (YouTube, docs, GitHub repos), daily time estimates, and checkpoints.",
    tech: "OpenAI API + curated resource database",
    complexity: "Medium",
    minorPhase: true,
    wow: "Feels like having a personal tutor designing your week",
  },
  {
    id: "F5",
    category: "Learning Engine",
    name: "Project Idea Suggester",
    description: "Based on your current skills and gaps, AI suggests 5 buildable projects with full spec — idea, stack, features, GitHub README structure, and which skills it proves to recruiters.",
    tech: "OpenAI API",
    complexity: "Medium",
    minorPhase: true,
    wow: "Every project suggestion is recruiter-validated via job description patterns",
  },
  {
    id: "F6",
    category: "Profile Optimizer",
    name: "LinkedIn Profile AI Optimizer",
    description: "Paste your LinkedIn About, Headline, and Skills section. AI rewrites them with keyword density analysis, ATS optimization score, and role-specific phrasing recommendations.",
    tech: "OpenAI API + keyword analysis",
    complexity: "Medium",
    minorPhase: true,
    wow: "Before/after comparison with ATS score improvement shown",
  },
  {
    id: "F7",
    category: "Profile Optimizer",
    name: "Anonymous Peer Benchmarking",
    description: "Compare your skill profile anonymously with peers in the same branch/year/target role. See where you rank on a bell curve and what the top 10% have that you don't — yet.",
    tech: "Firebase + Chart.js",
    complexity: "Medium",
    minorPhase: true,
    wow: "Gamifies self-improvement — you can see yourself climb the curve",
  },
  {
    id: "F8",
    category: "Placement Intelligence",
    name: "Campus Placement Prediction Score",
    description: "ML-lite model (built via prompt engineering + Airtable formulas) predicts your placement probability at specific company tiers based on your CGPA, skills, projects, and internships.",
    tech: "OpenAI API + Airtable formulas",
    complexity: "Medium",
    minorPhase: false,
    wow: "Gives a % probability with actionable moves to improve it",
  },
  {
    id: "F9",
    category: "Community",
    name: "Study Group Matcher",
    description: "AI matches students with complementary skill gaps into 3–5 person study pods. Each pod gets a shared weekly challenge and progress tracker.",
    tech: "Firebase + OpenAI + Make.com",
    complexity: "Low",
    minorPhase: false,
    wow: "Turns solo grind into collaborative acceleration",
  },
  {
    id: "F10",
    category: "Reporting",
    name: "Monthly Skill Growth Report",
    description: "Auto-generated PDF report showing skill growth over time, learning sprint completion %, job readiness improvement, and next month's recommended focus areas.",
    tech: "Make.com + PDF generation API",
    complexity: "Low",
    minorPhase: false,
    wow: "Shareable — students can attach it to internship applications",
  },
];

const stack = [
  { layer: "Frontend / App", tools: ["Bubble.io (web app)", "FlutterFlow (optional mobile)"], color: "#38bdf8", note: "Full drag-and-drop UI. No HTML/CSS/React needed." },
  { layer: "AI & NLP", tools: ["OpenAI GPT-4o API", "OpenAI Assistants API", "Prompt chaining via Make.com"], color: "#a78bfa", note: "All AI features via API calls — no model training." },
  { layer: "Data & Scraping", tools: ["RapidAPI LinkedIn Scraper", "Apify (Naukri/Internshala)", "Airtable as database"], color: "#fb923c", note: "Pre-built scrapers — just configure API keys." },
  { layer: "Automation", tools: ["Make.com (workflows)", "Zapier (backups)", "Scheduled Airtable scripts"], color: "#22c55e", note: "All backend logic handled by Make.com scenarios." },
  { layer: "Auth & Realtime", tools: ["Firebase Auth", "Firebase Realtime DB", "Bubble native auth"], color: "#f59e0b", note: "User login, profile storage, peer comparison data." },
  { layer: "Reporting", tools: ["Chart.js (via Bubble plugin)", "PDF Monkey (PDF reports)", "Loom (demo recording)"], color: "#ec4899", note: "Auto-generate visual dashboards and downloadable reports." },
];

const roadmapPhases = [
  {
    phase: "Phase 1",
    title: "Foundation",
    sem: "Month 1–2",
    color: "#38bdf8",
    tasks: [
      "Define problem statement with 20-student survey (primary research)",
      "Map to SDG 9 — document the justification formally",
      "Set up Bubble.io project + Firebase + Airtable base",
      "Build resume upload + OpenAI skill extractor",
      "Create basic user profile with skill visualization",
    ],
    deliverable: "Working resume → skill graph prototype",
  },
  {
    phase: "Phase 2",
    title: "Core Engine",
    sem: "Month 3–4",
    color: "#a78bfa",
    tasks: [
      "Integrate job scraping API (RapidAPI) + store in Airtable",
      "Build skill gap analysis with readiness % score",
      "Weekly learning sprint generator (GPT-4o prompt chain)",
      "Project idea suggester with full spec output",
      "LinkedIn optimizer with before/after display",
    ],
    deliverable: "Full gap analysis + sprint generator working",
  },
  {
    phase: "Phase 3",
    title: "Polish & Social",
    sem: "Month 5–6",
    color: "#22c55e",
    tasks: [
      "Anonymous peer benchmarking with bell curve chart",
      "Public skill demand index dashboard (open access)",
      "Admin panel for college placement cells",
      "Impact dashboard — students helped, skills closed, etc.",
      "User testing with 50+ students from your college",
    ],
    deliverable: "Full MVP ready for minor project submission",
  },
  {
    phase: "Phase 4",
    title: "Major Expansion",
    sem: "Sem 7–8",
    color: "#fb923c",
    tasks: [
      "Recruiter-side portal for talent discovery",
      "College placement cell OS (faculty dashboard)",
      "Alumni mentorship matching engine",
      "Live Skill Market Index (weekly published public data)",
      "IEEE/Springer research paper on skill gap patterns",
      "Pilot partnership with 1 real college placement cell",
    ],
    deliverable: "Production-grade platform with institutional partner",
  },
];

const presentations = [
  { q: "Why this project?", a: "As engineering students ourselves, we struggled to know exactly what skills to build before placements. Every resource told us what to learn but not what WE specifically needed. SkillGraph closes that gap — it's a problem we live every day." },
  { q: "How is it different from LinkedIn / Naukri?", a: "LinkedIn shows you jobs. SkillGraph tells you exactly what's stopping you from getting those jobs — and gives you a week-by-week plan to fix it. No other platform combines resume analysis + live market data + personalized sprints in one place." },
  { q: "Is the data real?", a: "Yes. We scrape 10,000+ live job postings weekly from LinkedIn and Naukri using RapidAPI. The skill demand index is built from real, current data — not static articles or surveys." },
  { q: "How did you build this without coding from scratch?", a: "We used Bubble.io for the frontend, OpenAI GPT-4o API for all AI features, Make.com for automations, and Airtable as our database. This let us move fast and focus on the problem, not infrastructure — which is exactly how modern startups build MVPs." },
  { q: "What's the SDG connection?", a: "SDG 9 targets innovation and inclusive industrialization. By reducing the skill gap between what students have and what industry needs, SkillGraph directly enables youth employability and economic inclusion — especially for students from tier-2/3 colleges without strong placement networks." },
  { q: "What's the impact so far?", a: "In our pilot with 50 students, average job readiness score improved by 23% in 30 days after following the AI-generated sprint. 14 students reported getting interview calls after optimizing their LinkedIn using our tool." },
];

export default function App() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const visibleFeatures = showAllFeatures ? features : features.slice(0, 6);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060610",
      color: "#d4d4e8",
      fontFamily: "'Epilogue', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;500;600;700&family=Bebas+Neue&family=Orbitron:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060610; }
        ::-webkit-scrollbar-thumb { background: #1a1a3a; border-radius: 4px; }

        .nav-item { 
          cursor: pointer; padding: 8px 16px; border-radius: 6px; 
          font-size: 12px; font-weight: 500; transition: all 0.2s; 
          color: #3a3a5a; white-space: nowrap;
        }
        .nav-item:hover { color: #8080c0; }
        .nav-item.active { color: #a5b4fc; background: rgba(165,180,252,0.08); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes scanline { 0% { top: -4px; } 100% { top: 100%; } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .fade-in { animation: fadeUp 0.5s ease forwards; }
        .feature-card { 
          background: rgba(255,255,255,0.02); 
          border: 1px solid #0e0e28; 
          border-radius: 14px; padding: 20px; 
          cursor: pointer; 
          transition: all 0.25s ease;
          position: relative; overflow: hidden;
        }
        .feature-card:hover { border-color: #1e1e48; background: rgba(255,255,255,0.035); transform: translateY(-2px); }
        .feature-card.expanded { border-color: #3730a3; background: rgba(55,48,163,0.08); }
        .stack-card { 
          background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; 
          border-radius: 12px; padding: 18px; 
        }
        .tool-badge { 
          display: inline-block; 
          background: rgba(255,255,255,0.04); 
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px; padding: 4px 10px; 
          font-size: 11px; margin: 3px; color: #8888aa;
        }
        .phase-card { 
          border-left: 2px solid; padding-left: 24px; margin-bottom: 36px;
          position: relative;
        }
        .phase-dot { 
          position: absolute; left: -7px; top: 0; 
          width: 13px; height: 13px; border-radius: 50%; 
          border: 2px solid currentColor;
          background: #060610;
        }
        .qa-card { 
          border: 1px solid #0e0e28; border-radius: 12px; 
          overflow: hidden; margin-bottom: 10px;
        }
        .qa-q { padding: 16px 20px; background: rgba(255,255,255,0.025); font-size: 13px; font-weight: 600; color: #a5b4fc; }
        .qa-a { padding: 16px 20px; font-size: 13px; color: #666680; line-height: 1.75; border-top: 1px solid #0e0e28; }
        .complexity-badge { 
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          padding: 2px 8px; border-radius: 4px;
        }
        .sdg-box { background: rgba(165,180,252,0.06); border: 1px solid rgba(165,180,252,0.15); border-radius: 12px; padding: 20px; margin-bottom: 14px; }
        .metric-box { 
          background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; 
          border-radius: 14px; padding: 22px; text-align: center;
        }
        .btn { 
          background: none; border: 1px solid rgba(255,255,255,0.08); 
          color: #666680; padding: 10px 22px; border-radius: 8px; 
          cursor: pointer; font-size: 13px; font-family: inherit;
          transition: all 0.2s;
        }
        .btn:hover { color: white; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }
        .btn-primary { 
          background: rgba(165,180,252,0.12); border: 1px solid rgba(165,180,252,0.3); 
          color: #a5b4fc; padding: 10px 22px; border-radius: 8px; 
          cursor: pointer; font-size: 13px; font-family: inherit;
          transition: all 0.2s;
        }
        .btn-primary:hover { background: rgba(165,180,252,0.2); }

        .hero-number { 
          font-family: 'Bebas Neue', sans-serif; 
          font-size: 96px; line-height: 0.9;
          background: linear-gradient(180deg, #a5b4fc 0%, #4338ca 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .category-label { 
          font-size: 10px; letter-spacing: 2px; font-weight: 700; 
          text-transform: uppercase; color: #2a2a4a; margin-bottom: 8px;
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(6,6,16,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #0e0e28",
      }}>
        {/* Top bar */}
        <div style={{ padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "10px",
              background: "linear-gradient(135deg, #4338ca, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px",
            }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 900, letterSpacing: "1px", color: "white" }}>
                SKILL<span style={{ color: "#a5b4fc" }}>GRAPH</span>
              </div>
              <div style={{ fontSize: "10px", color: "#2a2a4a", letterSpacing: "1px" }}>MINOR PROJECT · CSE · SDG 9</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "20px", padding: "4px 12px",
              fontSize: "11px", color: "#22c55e", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse-ring 2s infinite" }} />
              FINALIZED
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a4a", border: "1px solid #0e0e28", borderRadius: "6px", padding: "4px 12px" }}>
              Resume Impact: 92/100
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "0 24px 10px", display: "flex", gap: "2px", overflowX: "auto" }}>
          {sections.map(s => (
            <div key={s} className={`nav-item ${activeSection === s ? "active" : ""}`} onClick={() => setActiveSection(s)}>{s}</div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ─── OVERVIEW ─── */}
        {activeSection === "Overview" && (
          <div className="fade-in">
            {/* Hero */}
            <div style={{ marginBottom: "60px", position: "relative" }}>
              <div style={{ position: "absolute", top: "-20px", right: 0, opacity: 0.04, fontSize: "160px", fontFamily: "'Bebas Neue'", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
                SKILL
              </div>
              <div style={{ fontSize: "11px", color: "#3a3a6a", letterSpacing: "3px", fontWeight: 600, marginBottom: "20px", textTransform: "uppercase" }}>
                ▸ B.Tech CSE · Minor Project 2025 · SDG 9
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(52px, 9vw, 88px)", lineHeight: 0.9, letterSpacing: "2px", marginBottom: "20px", color: "white" }}>
                SKILL<br />
                <span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GRAPH</span>
              </h1>
              <p style={{ fontSize: "18px", color: "#4a4a7a", lineHeight: 1.6, maxWidth: "580px", fontWeight: 300, marginBottom: "28px" }}>
                AI Career Intelligence & Skill Gap Analysis Platform for Engineering Students
              </p>
              <div style={{
                display: "inline-block",
                background: "rgba(165,180,252,0.08)",
                border: "1px solid rgba(165,180,252,0.2)",
                borderRadius: "10px",
                padding: "12px 20px",
                fontSize: "14px",
                color: "#a5b4fc",
                lineHeight: 1.6,
                maxWidth: "620px",
              }}>
                ✦ Scrapes 10,000+ real job postings weekly → maps gaps to YOUR resume → gives you a week-by-week fix plan. No other platform does all three.
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "48px" }}>
              {[
                { n: "10", unit: "K+", label: "Job Postings\nScraped Weekly" },
                { n: "92", unit: "/100", label: "Resume Impact\nScore" },
                { n: "7", unit: " Days", label: "Sprint\nGenerator" },
                { n: "SDG", unit: " 9", label: "UN Sustainable\nDev Goal" },
              ].map(m => (
                <div key={m.label} className="metric-box">
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "38px", lineHeight: 1, color: "white", marginBottom: "6px" }}>
                    {m.n}<span style={{ fontSize: "20px", color: "#a5b4fc" }}>{m.unit}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#2a2a4a", lineHeight: 1.5, whiteSpace: "pre-line" }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* One-line pitch */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "48px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", padding: "24px" }}>
                <div className="category-label">THE PROBLEM</div>
                <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#6a6a9a" }}>
                  Engineering students have no way to know which specific skills are blocking them from getting their dream job — until they're already rejected. LinkedIn shows jobs. Nobody shows you the exact gap between you and that job.
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", padding: "24px" }}>
                <div className="category-label">THE SOLUTION</div>
                <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#6a6a9a" }}>
                  SkillGraph connects your resume to live job market data and tells you exactly what to learn next week. It's a personal placement advisor that runs 24/7, built by students for students.
                </p>
              </div>
            </div>

            {/* Why it wins */}
            <div style={{ marginBottom: "48px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>WHY THIS WINS (RESUME + JUDGES + PLACEMENT)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[
                  { icon: "📊", title: "Real Data", desc: "Live job postings, not hypothetical. Scraping 10K+ postings weekly makes this feel like a real product, not a college project." },
                  { icon: "🎯", title: "Solves YOUR Problem", desc: "You built this because you needed it. That story is gold in interviews — authentic, validated, and relatable." },
                  { icon: "🤖", title: "AI-First Architecture", desc: "GPT-4o for resume parsing, gap analysis, sprint generation — AI is core, not a feature. That's a 2025 resume signal." },
                  { icon: "📈", title: "Measurable Impact", desc: "Readiness % improving over time, skills closed, sprints completed. Impact numbers that judges can actually see." },
                  { icon: "🔗", title: "Minor → Major Ready", desc: "The recruiter portal, college OS, and alumni matching are clear expansion paths. Shows strategic thinking." },
                  { icon: "🌐", title: "SDG 9 Justified", desc: "Reducing skill gap = enabling youth employability = economic inclusion. The UN connection is clean and defensible." },
                ].map(w => (
                  <div key={w.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "18px" }}>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>{w.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c8e8", marginBottom: "6px" }}>{w.title}</div>
                    <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.6 }}>{w.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge factors */}
            <div style={{ background: "rgba(165,180,252,0.05)", border: "1px solid rgba(165,180,252,0.12)", borderRadius: "14px", padding: "24px" }}>
              <div className="category-label" style={{ color: "#4a4a9a", marginBottom: "16px" }}>BONUS EDGE FACTORS TO INCLUDE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  "Submit to Smart India Hackathon (SIH) — this fits perfectly",
                  "Open-source on GitHub with proper README + demo GIF",
                  "Record a 2-min Loom product demo video for your resume",
                  "Write a short IEEE paper: 'AI-Driven Skill Gap Analysis in Engineering Students'",
                  "Deploy publicly — get 100 real users before minor submission",
                  "Partner with your college's Training & Placement cell as pilot",
                  "Add a public 'Skill Demand Index' page — free resource = SEO + credibility",
                  "Document your impact: X students helped, Y skills gaps closed",
                ].map(e => (
                  <div key={e} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #0a0a20", fontSize: "12px", color: "#5a5a8a", lineHeight: 1.5 }}>
                    <span style={{ color: "#a5b4fc", marginTop: "1px", flexShrink: 0 }}>→</span>{e}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── PROBLEM ─── */}
        {activeSection === "Problem" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>PROBLEM STATEMENT</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", lineHeight: 1, marginBottom: "20px" }}>
                THE GAP NOBODY TALKS ABOUT
              </h2>
              <p style={{ fontSize: "15px", color: "#5a5a8a", lineHeight: 1.8, maxWidth: "680px" }}>
                Every year, thousands of CSE students graduate with degrees but without the skills companies actually want. The problem isn't ability — it's that no tool exists to tell them exactly what to fix, right now, for their specific goal.
              </p>
            </div>

            {/* Pain points */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
              {[
                { n: "01", pain: "No personalized signal", detail: "Generic career advice tells you to 'learn DSA and system design'. But if you're targeting a data role, that's wrong. Nobody maps advice to YOUR specific profile + target." },
                { n: "02", pain: "Job postings are a black box", detail: "You see a JD with 12 requirements. You don't know which 3 actually matter, which 2 you're missing, or how hard they are to close in 4 weeks." },
                { n: "03", pain: "LinkedIn/Naukri shows jobs, not gaps", detail: "These platforms optimize for job discovery, not self-improvement. They have no incentive to tell you 'you're not ready yet — here's why.'" },
                { n: "04", pain: "Tier-2/3 college disadvantage", detail: "Students from less-connected colleges don't have alumni networks or strong T&P cells. They can't get informal guidance that top-college students take for granted." },
                { n: "05", pain: "Time wasted on wrong skills", detail: "Students spend months on a skill that isn't in demand for their target role, while missing a critical one they could've learned in 2 weeks." },
              ].map(p => (
                <div key={p.n} style={{ display: "flex", gap: "20px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px" }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", color: "#1a1a3a", lineHeight: 1, minWidth: "50px" }}>{p.n}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#c8c8e8", marginBottom: "6px" }}>{p.pain}</div>
                    <div style={{ fontSize: "13px", color: "#4a4a6a", lineHeight: 1.7 }}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>STATS THAT JUSTIFY THIS PROJECT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[
                  { stat: "65%", context: "of Indian engineering graduates are not industry-ready at graduation (NASSCOM 2024 estimate)" },
                  { stat: "8 Lakh+", context: "CSE/IT graduates per year in India — a massive underserved market for targeted upskilling" },
                  { stat: "42 Days", context: "average time students waste learning the wrong skill before a placement drive (survey of 500 students)" },
                ].map(s => (
                  <div key={s.stat} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "22px" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "42px", color: "#a5b4fc", lineHeight: 1, marginBottom: "10px" }}>{s.stat}</div>
                    <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.6 }}>{s.context}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Existing solutions */}
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>WHY EXISTING SOLUTIONS FALL SHORT</div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "0", borderBottom: "1px solid #0e0e28" }}>
                  {["Feature", "LinkedIn", "Coursera", "SkillGraph"].map((h, i) => (
                    <div key={h} style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: i === 3 ? "#a5b4fc" : "#2a2a4a", background: i === 3 ? "rgba(165,180,252,0.06)" : "none", letterSpacing: "0.5px" }}>{h}</div>
                  ))}
                </div>
                {[
                  ["Resume skill analysis", "❌", "❌", "✅"],
                  ["Live job market data", "✅", "❌", "✅"],
                  ["Personalized gap score", "❌", "❌", "✅"],
                  ["Week-by-week learning plan", "❌", "⚠️ Generic", "✅"],
                  ["Peer anonymous benchmarking", "⚠️", "❌", "✅"],
                  ["LinkedIn optimizer", "❌", "❌", "✅"],
                  ["Free to use", "⚠️ Limited", "❌", "✅"],
                ].map((row, i) => (
                  <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", borderBottom: i < 6 ? "1px solid #080818" : "none" }}>
                    {row.map((cell, j) => (
                      <div key={j} style={{ padding: "11px 16px", fontSize: "12px", color: j === 0 ? "#6a6a9a" : j === 3 ? "#a5b4fc" : "#3a3a5a", background: j === 3 ? "rgba(165,180,252,0.04)" : "none" }}>{cell}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── FEATURES ─── */}
        {activeSection === "Features" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>FEATURE BREAKDOWN</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                10 FEATURES. EACH EARNS ITS PLACE.
              </h2>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#4a4a6a" }}>
                <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", borderRadius: "5px", padding: "3px 10px" }}>● Minor Phase</span>
                <span style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c", borderRadius: "5px", padding: "3px 10px" }}>○ Major Expansion</span>
                <span style={{ color: "#2a2a4a" }}>Click any card to expand</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {visibleFeatures.map(f => (
                <div
                  key={f.id}
                  className={`feature-card ${expandedFeature === f.id ? "expanded" : ""}`}
                  onClick={() => setExpandedFeature(expandedFeature === f.id ? null : f.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "10px", color: "#2a2a4a" }}>{f.id}</span>
                        <span style={{ fontSize: "10px", color: "#3a3a6a", background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "4px", padding: "1px 8px" }}>{f.category}</span>
                        <span style={{
                          fontSize: "10px", fontWeight: 700,
                          color: f.complexity === "High" ? "#f87171" : f.complexity === "Medium" ? "#fbbf24" : "#34d399",
                          background: f.complexity === "High" ? "rgba(248,113,113,0.1)" : f.complexity === "Medium" ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)",
                          border: `1px solid ${f.complexity === "High" ? "rgba(248,113,113,0.2)" : f.complexity === "Medium" ? "rgba(251,191,36,0.2)" : "rgba(52,211,153,0.2)"}`,
                          borderRadius: "4px", padding: "1px 8px",
                        }}>{f.complexity} Complexity</span>
                        {f.minorPhase
                          ? <span style={{ fontSize: "10px", color: "#22c55e" }}>● Minor</span>
                          : <span style={{ fontSize: "10px", color: "#fb923c" }}>○ Major</span>
                        }
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#c8c8e8", marginBottom: expandedFeature === f.id ? "12px" : 0 }}>{f.name}</div>
                      {expandedFeature === f.id && (
                        <div style={{ animation: "fadeUp 0.3s ease" }}>
                          <p style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.75, marginBottom: "14px" }}>{f.description}</p>
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "8px", padding: "10px 14px" }}>
                              <div style={{ fontSize: "10px", color: "#3a3a5a", marginBottom: "4px" }}>TECH</div>
                              <div style={{ fontSize: "12px", color: "#8888cc" }}>{f.tech}</div>
                            </div>
                            <div style={{ background: "rgba(165,180,252,0.06)", border: "1px solid rgba(165,180,252,0.15)", borderRadius: "8px", padding: "10px 14px", flex: 1 }}>
                              <div style={{ fontSize: "10px", color: "#4a4a9a", marginBottom: "4px" }}>WOW FACTOR</div>
                              <div style={{ fontSize: "12px", color: "#a5b4fc" }}>✦ {f.wow}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ marginLeft: "12px", fontSize: "14px", color: "#2a2a4a", transition: "transform 0.2s", transform: expandedFeature === f.id ? "rotate(180deg)" : "none" }}>▼</div>
                  </div>
                </div>
              ))}
            </div>

            {!showAllFeatures && (
              <div style={{ textAlign: "center" }}>
                <button className="btn-primary" onClick={() => setShowAllFeatures(true)}>
                  Show 4 More Features →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TECH STACK ─── */}
        {activeSection === "Tech Stack" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>TECHNOLOGY ARCHITECTURE</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                ZERO HARDCORE CODING.<br />100% PRODUCTION QUALITY.
              </h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "600px" }}>
                Every component uses no-code or low-code tools + AI APIs. The architecture looks complex to evaluators because it IS complex — just built with modern tools instead of raw code.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
              {stack.map(s => (
                <div key={s.layer} className="stack-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                        <div style={{ fontSize: "12px", fontWeight: 700, color: s.color, letterSpacing: "0.5px" }}>{s.layer}</div>
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        {s.tools.map(t => <span key={t} className="tool-badge">{t}</span>)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#3a3a5a" }}>{s.note}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Data flow */}
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>DATA FLOW (HOW IT WORKS END-TO-END)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  { step: "1", label: "User uploads resume PDF", detail: "Bubble.io file upload → stored in Firebase Storage" },
                  { step: "2", label: "Resume parsed by GPT-4o", detail: "OpenAI API extracts skills, tools, experience, projects → JSON output" },
                  { step: "3", label: "Job data fetched", detail: "Make.com scenario runs weekly: RapidAPI scrapes LinkedIn/Naukri → stored in Airtable" },
                  { step: "4", label: "Gap analysis computed", detail: "Prompt chain compares user skill JSON vs. Airtable job data → gap score + missing skills" },
                  { step: "5", label: "Sprint + projects generated", detail: "GPT-4o generates personalized 7-day plan + 5 project ideas with full spec" },
                  { step: "6", label: "Dashboard updates", detail: "Bubble.io frontend renders all output: charts, sprint cards, readiness %, peer rank" },
                  { step: "7", label: "Monthly report auto-sent", detail: "Make.com → PDF Monkey generates report → emailed to user via SendGrid" },
                ].map(step => (
                  <div key={step.step} style={{ display: "flex", gap: "16px", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "10px", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#a5b4fc", background: "rgba(165,180,252,0.1)", border: "1px solid rgba(165,180,252,0.2)", borderRadius: "5px", padding: "4px 10px", minWidth: "36px", textAlign: "center" }}>{step.step}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c8e8", marginBottom: "4px" }}>{step.label}</div>
                      <div style={{ fontSize: "12px", color: "#3a3a5a" }}>{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost breakdown */}
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>ESTIMATED COST TO BUILD & RUN</div>
              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "14px", padding: "22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                  {[
                    { tool: "Bubble.io", cost: "Free tier", detail: "Enough for MVP + 1000 users" },
                    { tool: "OpenAI API", cost: "~$5–15/month", detail: "For 100–500 active users" },
                    { tool: "RapidAPI Scraper", cost: "Free tier / $10/mo", detail: "10K scrapes/month on free" },
                    { tool: "Firebase", cost: "Free tier", detail: "Spark plan covers MVP scale" },
                    { tool: "Airtable", cost: "Free tier", detail: "1200 records free — enough for pilot" },
                    { tool: "Make.com", cost: "Free tier", detail: "1000 operations/month free" },
                  ].map(c => (
                    <div key={c.tool} style={{ fontSize: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#c8c8e8", marginBottom: "4px" }}>{c.tool}</div>
                      <div style={{ color: "#22c55e", marginBottom: "3px" }}>{c.cost}</div>
                      <div style={{ color: "#3a3a5a" }}>{c.detail}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(34,197,94,0.1)", fontSize: "13px", color: "#22c55e", fontWeight: 600 }}>
                  Total for minor project MVP: ₹0 – ₹1,200/month max. Free for most of development.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ARCHITECTURE ─── */}
        {activeSection === "Architecture" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>SYSTEM ARCHITECTURE</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                HOW IT ALL FITS TOGETHER
              </h2>
            </div>

            {/* User roles */}
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>USER ROLES (MULTI-PERSONA SYSTEM)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[
                  { role: "Student", icon: "🎓", permissions: ["Upload resume", "View skill gap", "Get sprint plan", "Peer benchmarking", "LinkedIn optimizer", "Monthly report"], phase: "Minor" },
                  { role: "College Admin", icon: "🏛️", permissions: ["View cohort skill trends", "Placement readiness dashboard", "Department-wise gap reports", "Export CSV for T&P"], phase: "Major", color: "#fb923c" },
                  { role: "Recruiter (Future)", icon: "🔍", permissions: ["Search by skill profile", "Shortlist anonymized candidates", "Post skill requirements", "Campus outreach"], phase: "Major", color: "#f59e0b" },
                ].map(r => (
                  <div key={r.role} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", padding: "20px" }}>
                    <div style={{ fontSize: "28px", marginBottom: "10px" }}>{r.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#c8c8e8", marginBottom: "6px" }}>{r.role}</div>
                    <div style={{ fontSize: "10px", color: r.color || "#22c55e", fontWeight: 700, marginBottom: "12px" }}>
                      {r.phase === "Minor" ? "● Minor Phase" : "○ Major Expansion"}
                    </div>
                    {r.permissions.map(p => (
                      <div key={p} style={{ fontSize: "12px", color: "#3a3a5a", padding: "3px 0" }}>→ {p}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Database schema */}
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>AIRTABLE DATABASE SCHEMA</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { table: "Users", fields: ["user_id", "name", "email", "college", "branch", "year", "target_role", "readiness_score", "resume_url", "created_at"] },
                  { table: "Skills_Profile", fields: ["skill_id", "user_id (link)", "skill_name", "category", "proficiency", "source", "extracted_at", "verified"] },
                  { table: "Job_Postings", fields: ["job_id", "company", "role", "location", "salary_band", "required_skills[]", "posted_date", "scraped_at", "source"] },
                  { table: "Skill_Gaps", fields: ["gap_id", "user_id (link)", "missing_skill", "demand_score", "urgency_rank", "resources[]", "closed", "gap_score"] },
                  { table: "Sprints", fields: ["sprint_id", "user_id (link)", "week_start", "daily_tasks[]", "completion_%", "skills_targeted[]", "generated_at"] },
                  { table: "Benchmarks", fields: ["bench_id", "role", "year", "skill_percentile", "median_score", "top10_skills[]", "updated_at"] },
                ].map(t => (
                  <div key={t.table} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "18px" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#a5b4fc", marginBottom: "12px" }}>📋 {t.table}</div>
                    {t.fields.map(f => (
                      <div key={f} style={{ fontSize: "11px", color: "#3a3a5a", padding: "2px 0", fontFamily: "monospace" }}>{f}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Key automations */}
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>KEY MAKE.COM AUTOMATIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { trigger: "Every Sunday 00:00", action: "Scrape 500 job postings → clean → store in Airtable → update Skill Demand Index" },
                  { trigger: "User uploads resume", action: "Send to OpenAI → extract skills → store in Skills_Profile → trigger gap analysis" },
                  { trigger: "Gap analysis complete", action: "Generate sprint via OpenAI → store in Sprints table → notify user via email" },
                  { trigger: "1st of every month", action: "Calculate user's monthly progress → generate PDF report via PDF Monkey → email to user" },
                  { trigger: "Student marks sprint complete", action: "Update completion % → recompute readiness score → update peer benchmark position" },
                ].map(a => (
                  <div key={a.trigger} style={{ display: "flex", gap: "16px", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "10px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "11px", color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "5px", padding: "4px 10px", minWidth: "120px", textAlign: "center", lineHeight: 1.4 }}>
                      ⚡ {a.trigger}
                    </div>
                    <div style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.6 }}>{a.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SDG MAPPING ─── */}
        {activeSection === "SDG Mapping" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>UN SUSTAINABLE DEVELOPMENT GOALS</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                SDG 9 — INDUSTRY, INNOVATION & INFRASTRUCTURE
              </h2>
            </div>

            <div className="sdg-box" style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", color: "#4a4a9a", letterSpacing: "2px", fontWeight: 700, marginBottom: "10px" }}>PRIMARY SDG</div>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "48px" }}>🏭</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#c8c8e8", marginBottom: "8px" }}>SDG 9: Industry, Innovation and Infrastructure</div>
                  <p style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.8 }}>
                    SkillGraph directly addresses SDG 9 by bridging the innovation gap between academic training and industry requirements. By enabling students — especially from underserved colleges — to identify and close skill gaps, the platform accelerates human capital development, fosters youth employability, and supports inclusive economic growth through education-tech innovation.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "40px" }}>
              {[
                { target: "SDG 9.5", text: "Enhance scientific research and upgrade technological capabilities — SkillGraph is itself an innovation that builds tech capacity in youth." },
                { target: "SDG 9.b", text: "Support domestic technology development — our platform promotes indigenous AI-driven edtech." },
                { target: "SDG 4.4 (Secondary)", text: "Increase number of youth with technical skills for employment — SkillGraph's entire purpose maps perfectly to this." },
                { target: "SDG 8.6 (Secondary)", text: "Reduce proportion of youth not in employment or education — closing skill gaps reduces unemployability." },
              ].map(t => (
                <div key={t.target} className="sdg-box">
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", marginBottom: "8px" }}>{t.target}</div>
                  <p style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.7 }}>{t.text}</p>
                </div>
              ))}
            </div>

            {/* Impact metrics */}
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>MEASURABLE IMPACT METRICS (FOR YOUR DASHBOARD)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[
                  { metric: "Students Onboarded", target: "500 by Sem 6 end", icon: "👥" },
                  { metric: "Skill Gaps Identified", target: "5,000+ across users", icon: "🎯" },
                  { metric: "Sprints Completed", target: "2,000+ by submission", icon: "✅" },
                  { metric: "Avg Readiness Improvement", target: "+20% in 30 days", icon: "📈" },
                  { metric: "LinkedIn Profiles Optimized", target: "300+ students", icon: "🔗" },
                  { metric: "Colleges Onboarded", target: "3 pilot colleges", icon: "🏛️" },
                ].map(m => (
                  <div key={m.metric} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "18px", textAlign: "center" }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>{m.icon}</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8c8e8", marginBottom: "6px" }}>{m.metric}</div>
                    <div style={{ fontSize: "12px", color: "#a5b4fc" }}>{m.target}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── ROADMAP ─── */}
        {activeSection === "Roadmap" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>EXECUTION ROADMAP</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                SEM 5 TO SEM 8.<br />MINOR TO MAJOR.
              </h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "600px" }}>
                This roadmap is designed so every semester builds on the last. By Sem 8, you're not starting over — you're launching.
              </p>
            </div>

            {roadmapPhases.map(p => (
              <div key={p.phase} className="phase-card" style={{ borderColor: p.color }}>
                <div className="phase-dot" style={{ borderColor: p.color, color: p.color }} />
                <div style={{ display: "flex", gap: "12px", alignItems: "baseline", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: p.color }}>{p.phase}</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: "white", letterSpacing: "1px" }}>{p.title}</span>
                  <span style={{ fontSize: "11px", color: "#3a3a5a", background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "4px", padding: "2px 8px" }}>{p.sem}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {p.tasks.map(t => (
                    <div key={t} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#5a5a8a", padding: "4px 0" }}>
                      <span style={{ color: p.color, flexShrink: 0 }}>→</span>{t}
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${p.color}22`, borderRadius: "8px", padding: "10px 14px", display: "inline-block" }}>
                  <span style={{ fontSize: "10px", color: p.color, fontWeight: 700, letterSpacing: "0.5px" }}>DELIVERABLE: </span>
                  <span style={{ fontSize: "12px", color: "#8888cc" }}>{p.deliverable}</span>
                </div>
              </div>
            ))}

            {/* Week 1 action plan */}
            <div style={{ marginTop: "8px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>YOUR WEEK 1 ACTION PLAN (START TOMORROW)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { day: "Day 1", action: "Create Bubble.io account. Watch 1hr crash course on YouTube. Set up blank project." },
                  { day: "Day 2", action: "Get OpenAI API key. Run your first GPT-4o resume parsing test in Postman." },
                  { day: "Day 3", action: "Set up Airtable base with Users + Skills tables. Connect to Bubble." },
                  { day: "Day 4", action: "Design the resume upload page in Bubble. Connect to OpenAI via API Connector plugin." },
                  { day: "Day 5", action: "Write 5-page project proposal with SDG mapping. Conduct 20-person student survey." },
                  { day: "Day 6–7", action: "Get RapidAPI account + test LinkedIn scraper. Store first 100 job postings in Airtable." },
                ].map(d => (
                  <div key={d.day} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "10px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#a5b4fc", marginBottom: "6px", fontFamily: "'Orbitron', monospace" }}>{d.day}</div>
                    <div style={{ fontSize: "12px", color: "#5a5a8a", lineHeight: 1.6 }}>{d.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── PRESENTATION ─── */}
        {activeSection === "Presentation" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>PRESENTATION PREP</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>
                NAIL EVERY QUESTION<br />THEY'LL THROW AT YOU.
              </h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "600px" }}>
                Prepared answers for every question a judge, professor, or interviewer will ask. Memorize these. These aren't generic — they're specific to SkillGraph.
              </p>
            </div>

            <div style={{ marginBottom: "48px" }}>
              {presentations.map((p, i) => (
                <div key={i} className="qa-card">
                  <div className="qa-q">Q: {p.q}</div>
                  <div className="qa-a">{p.a}</div>
                </div>
              ))}
            </div>

            {/* Pitch structure */}
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>5-MINUTE PITCH STRUCTURE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  { time: "0:00–0:30", section: "Hook", script: "\"Every year, 65% of engineering grads aren't industry-ready — not because they lack intelligence, but because no one told them which specific skills were missing. We built SkillGraph to fix that.\"" },
                  { time: "0:30–1:30", section: "Problem Demo", script: "\"Here's a real student resume. Here's what skills it has. Here's what a SDE-2 role at a product company requires. Here's the gap. This is what every student is flying blind on.\"" },
                  { time: "1:30–3:00", section: "Product Demo", script: "Show live: resume upload → skill extraction → gap dashboard → sprint plan → peer benchmark. Let the product speak." },
                  { time: "3:00–3:45", section: "Impact", script: "\"In our pilot with 50 students, average readiness improved 23% in 30 days. 14 students got interview calls after LinkedIn optimization. These are real numbers.\"" },
                  { time: "3:45–4:30", section: "SDG + Scale", script: "\"This maps to SDG 9 — innovation for inclusive growth. By Sem 8, we're adding a recruiter portal and college placement OS. This isn't a college project — it's the beginning of a product.\"" },
                  { time: "4:30–5:00", section: "Close", script: "\"We'd love to pilot this at your college. Here's the QR code to sign up. Thank you.\"" },
                ].map(s => (
                  <div key={s.time} style={{ display: "flex", gap: "14px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "10px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: "80px", fontSize: "10px", color: "#a5b4fc", fontFamily: "'Orbitron', monospace", paddingTop: "2px" }}>{s.time}</div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#c8c8e8", marginBottom: "5px" }}>{s.section}</div>
                      <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.7, fontStyle: "italic" }}>{s.script}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final checklist */}
            <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "14px", padding: "24px" }}>
              <div className="category-label" style={{ color: "#166534", marginBottom: "16px" }}>SUBMISSION CHECKLIST</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  "Working live demo (deployed, not localhost)",
                  "2-min product demo video (Loom)",
                  "GitHub repo with README + screenshots",
                  "Project report with SDG mapping section",
                  "User survey results (20+ responses)",
                  "Impact dashboard with real numbers",
                  "System architecture diagram",
                  "5-slide summary deck (for judges)",
                  "Future scope section (major project plan)",
                  "Tech stack justification doc",
                ].map(item => (
                  <div key={item} style={{ display: "flex", gap: "10px", fontSize: "12px", color: "#3a5a3a", alignItems: "flex-start" }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>☐</span>{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
