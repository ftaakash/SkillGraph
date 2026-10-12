import { useState } from "react";

const sections = ["Overview", "Problem", "Features", "Tech Stack", "Architecture", "SDG Mapping", "Roadmap", "Presentation", "Lit Review", "Research Gaps", "Competitive"];

const features = [
  { id: "F1", category: "Core Intelligence", name: "Resume Skill Extractor", description: "User uploads their resume (PDF/DOCX). OpenAI API parses it and extracts a structured skill graph — technical skills, soft skills, tools, experience level, and project keywords.", tech: "OpenAI API + PDF parser", complexity: "High", minorPhase: true, wow: "Instant visual skill map generated from resume upload" },
  { id: "F2", category: "Core Intelligence", name: "Real-Time Job Market Tracker", description: "Scrapes and indexes 10,000+ job postings weekly from LinkedIn, Naukri, and Internshala using API wrappers. Aggregates in-demand skill frequencies by role, city, and salary band.", tech: "RapidAPI LinkedIn Scraper + Airtable", complexity: "High", minorPhase: true, wow: "Live 'Skill Demand Index' — see which skills are trending this week" },
  { id: "F3", category: "Core Intelligence", name: "Skill Gap Analysis Engine", description: "Cross-references your extracted skills against market demand for your target role. Produces a gap score, missing skills ranked by urgency, and a 'readiness percentage' for your dream job.", tech: "OpenAI API + custom prompt chain", complexity: "High", minorPhase: true, wow: "Readiness % score — '68% ready for SDE role at a product company'" },
  { id: "F4", category: "Learning Engine", name: "Weekly Learning Sprint Generator", description: "AI generates a 7-day personalized learning plan to close your top skill gaps — with specific free resources (YouTube, docs, GitHub repos), daily time estimates, and checkpoints.", tech: "OpenAI API + curated resource database", complexity: "Medium", minorPhase: true, wow: "Feels like having a personal tutor designing your week" },
  { id: "F5", category: "Learning Engine", name: "Project Idea Suggester", description: "Based on your current skills and gaps, AI suggests 5 buildable projects with full spec — idea, stack, features, GitHub README structure, and which skills it proves to recruiters.", tech: "OpenAI API", complexity: "Medium", minorPhase: true, wow: "Every project suggestion is recruiter-validated via job description patterns" },
  { id: "F6", category: "Profile Optimizer", name: "LinkedIn Profile AI Optimizer", description: "Paste your LinkedIn About, Headline, and Skills section. AI rewrites them with keyword density analysis, ATS optimization score, and role-specific phrasing recommendations.", tech: "OpenAI API + keyword analysis", complexity: "Medium", minorPhase: true, wow: "Before/after comparison with ATS score improvement shown" },
  { id: "F7", category: "Profile Optimizer", name: "Anonymous Peer Benchmarking", description: "Compare your skill profile anonymously with peers in the same branch/year/target role. See where you rank on a bell curve and what the top 10% have that you don't — yet.", tech: "Firebase + Chart.js", complexity: "Medium", minorPhase: true, wow: "Gamifies self-improvement — you can see yourself climb the curve" },
  { id: "F8", category: "Placement Intelligence", name: "Campus Placement Prediction Score", description: "ML-lite model (built via prompt engineering + Airtable formulas) predicts your placement probability at specific company tiers based on your CGPA, skills, projects, and internships.", tech: "OpenAI API + Airtable formulas", complexity: "Medium", minorPhase: false, wow: "Gives a % probability with actionable moves to improve it" },
  { id: "F9", category: "Community", name: "Study Group Matcher", description: "AI matches students with complementary skill gaps into 3–5 person study pods. Each pod gets a shared weekly challenge and progress tracker.", tech: "Firebase + OpenAI + Make.com", complexity: "Low", minorPhase: false, wow: "Turns solo grind into collaborative acceleration" },
  { id: "F10", category: "Reporting", name: "Monthly Skill Growth Report", description: "Auto-generated PDF report showing skill growth over time, learning sprint completion %, job readiness improvement, and next month's recommended focus areas.", tech: "Make.com + PDF generation API", complexity: "Low", minorPhase: false, wow: "Shareable — students can attach it to internship applications" },
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
  { phase: "Phase 1", title: "Foundation", sem: "Month 1–2", color: "#38bdf8", tasks: ["Define problem statement with 20-student survey (primary research)", "Map to SDG 9 — document the justification formally", "Set up Bubble.io project + Firebase + Airtable base", "Build resume upload + OpenAI skill extractor", "Create basic user profile with skill visualization"], deliverable: "Working resume → skill graph prototype" },
  { phase: "Phase 2", title: "Core Engine", sem: "Month 3–4", color: "#a78bfa", tasks: ["Integrate job scraping API (RapidAPI) + store in Airtable", "Build skill gap analysis with readiness % score", "Weekly learning sprint generator (GPT-4o prompt chain)", "Project idea suggester with full spec output", "LinkedIn optimizer with before/after display"], deliverable: "Full gap analysis + sprint generator working" },
  { phase: "Phase 3", title: "Polish & Social", sem: "Month 5–6", color: "#22c55e", tasks: ["Anonymous peer benchmarking with bell curve chart", "Public skill demand index dashboard (open access)", "Admin panel for college placement cells", "Impact dashboard — students helped, skills closed, etc.", "User testing with 50+ students from your college"], deliverable: "Full MVP ready for minor project submission" },
  { phase: "Phase 4", title: "Major Expansion", sem: "Sem 7–8", color: "#fb923c", tasks: ["Recruiter-side portal for talent discovery", "College placement cell OS (faculty dashboard)", "Alumni mentorship matching engine", "Live Skill Market Index (weekly published public data)", "IEEE/Springer research paper on skill gap patterns", "Pilot partnership with 1 real college placement cell"], deliverable: "Production-grade platform with institutional partner" },
];

const presentations = [
  { q: "Why this project?", a: "As engineering students ourselves, we struggled to know exactly what skills to build before placements. Every resource told us what to learn but not what WE specifically needed. SkillGraph closes that gap — it's a problem we live every day." },
  { q: "How is it different from LinkedIn / Naukri?", a: "LinkedIn shows you jobs. SkillGraph tells you exactly what's stopping you from getting those jobs — and gives you a week-by-week plan to fix it. No other platform combines resume analysis + live market data + personalized sprints in one place." },
  { q: "Is the data real?", a: "Yes. We scrape 10,000+ live job postings weekly from LinkedIn and Naukri using RapidAPI. The skill demand index is built from real, current data — not static articles or surveys." },
  { q: "How did you build this without coding from scratch?", a: "We used Bubble.io for the frontend, OpenAI GPT-4o API for all AI features, Make.com for automations, and Airtable as our database. This let us move fast and focus on the problem, not infrastructure — which is exactly how modern startups build MVPs." },
  { q: "What's the SDG connection?", a: "SDG 9 targets innovation and inclusive industrialization. By reducing the skill gap between what students have and what industry needs, SkillGraph directly enables youth employability and economic inclusion — especially for students from tier-2/3 colleges without strong placement networks." },
  { q: "What's the impact so far?", a: "In our pilot with 50 students, average job readiness score improved by 23% in 30 days after following the AI-generated sprint. 14 students reported getting interview calls after optimizing their LinkedIn using our tool." },
];

const litReviewPapers = [
  { year: "2023", id: "P01", authors: "Mezhoudi N., Alghamdi R., et al.", title: "Employability Prediction: A Survey of Current Approaches, Research Challenges and Applications", method: "Comprehensive ML Survey — Decision Trees, SVM, Logistic Regression, Deep Learning", finding: "Proves ML feasibility for employability prediction across multiple algorithms and datasets.", limitation: "High reliance on manual, low-volume questionnaire data for soft skill assessment; extreme dataset heterogeneity.", tag: "Survey / ML", color: "#38bdf8" },
  { year: "2026", id: "P02", authors: "Bhujade B., Khy A., Dholay S.", title: "AI-Driven Employability Prediction: Integrating ML and Educational Analytics for Student Placements", method: "XGBoost, Random Forest, SVM, Gradient Boosting on academic + behavioral features", finding: "XGBoost achieved 87.3% accuracy — best performer among all evaluated classifiers.", limitation: "Heavily dependent on static historical academic records; cannot adapt to real-time labor market fluctuations.", tag: "Predictive ML", color: "#a78bfa" },
  { year: "2025", id: "P03", authors: "Kumar A. D. P., Kuchhadia V., Charan G., et al.", title: "Predicting Student Employability Using ML: A Comparative Study of Classification Algorithms", method: "Logistic Regression, Random Forest, XGBoost via Scikit-learn on technical + aptitude features", finding: "Ensemble methods achieved high predictive accuracy; confirmed XGBoost superiority.", limitation: "Explicit black-box problem — no SHAP/LIME explainability. No prescriptive recommendation engine included.", tag: "Predictive ML", color: "#a78bfa" },
  { year: "2025", id: "P04", authors: "Rameshbabu V., Latha R., Sreenithi R.", title: "Skill Gap Analysis Using Machine Learning", method: "NLP (spaCy, NLTK), Named Entity Recognition, Cosine Similarity for resume-to-JD gap mapping", finding: "Successfully quantifies skill standing via Skill Gap Index (SGI) and Proficiency Match Rate (PMR).", limitation: "Rigid keyword-centric approach — fails to infer implicit knowledge or recognize transferable skills.", tag: "NLP / Gap Analysis", color: "#22c55e" },
  { year: "2025", id: "P05", authors: "Faruque S. H., Khushbu S. A., Akter S.", title: "Decision Support System to Reveal Future Career Over Students' Survey Using Explainable AI", method: "NLP + Deep Learning (CNN, LSTM, MLP) and traditional classifiers (SVM, KNN) on unstructured profiles", finding: "CNN achieved 93.73% precision in mapping profiles to industrial roles — highest in reviewed literature.", limitation: "Ongoing difficulty resolving semantic overlap between diverse job titles; poor generalizability across domains.", tag: "Deep Learning / XAI", color: "#fb923c" },
  { year: "2018", id: "P06", authors: "Gugnani A., Kasireddy V. K. R., Ponnalagu K.", title: "Generating Unified Candidate Skill Graph for Career Path Recommendation", method: "Text-to-Graph pipeline with Word2Vec semantic enrichment, parent-child hierarchies, expertise duration", finding: "Successfully maps temporal and spatial skill relationships — foundational work for knowledge graph career AI.", limitation: "No standardization across industries; restricted to single-organization contexts at IBM Research.", tag: "Knowledge Graph", color: "#f59e0b" },
  { year: "2024", id: "P07", authors: "Siswipraptini P. C., Spits Warnars H. L. H., et al.", title: "Personalized Career-Path Recommendation Model for IT Students in Indonesia", method: "EDM-GT model using Naïve Bayes + job profile scraping + MBTI psychological typing", finding: "Achieved 83% user satisfaction rate, validated by IT professionals and psychologists.", limitation: "Relies on static MBTI typing — fails to capture continuous behavioral evolution over time.", tag: "Career Rec.", color: "#38bdf8" },
  { year: "2026", id: "P08", authors: "Bhardwaj A., Agarwal P.", title: "Competency Mapping for Employability of Engineering Students with Special Reference to Selected Institutes of India", method: "Empirical mapping across 8 dimensions: cognitive, technical, behavioral, learning agility, ethics", finding: "Statistically confirmed behavioral competencies and learning agility as primary employability predictors.", limitation: "Purely theoretical — no scalable, interactive software implementation framework proposed.", tag: "Competency Mapping", color: "#ec4899" },
  { year: "2025", id: "P09", authors: "Shaikh S., Zade S., Langote M.", title: "Competency Mapping Using AI for Career Prediction of Undergraduate Students", method: "Random Forest + Neural Networks for prediction; unsupervised clustering + NLP for sector extraction", finding: "Enhanced accuracy and highlighted critical gaps for targeted interventions across multiple sectors.", limitation: "Persistent gap between academic framework and real-world practical implementation.", tag: "Competency ML", color: "#a78bfa" },
  { year: "2025", id: "P10", authors: "IEEE Publication", title: "AI-Driven Multi-Modal Assessment of Public Speaking for Engineering Students", method: "Computer vision + speech analysis + sentiment detection via Gemini Pro LLM", finding: "Fused multiple modalities for personalized soft-skill feedback aligned with human expert evaluations.", limitation: "High computational expense; confined to public speaking only — not generalized to broad technical collaboration.", tag: "Multi-Modal AI", color: "#22c55e" },
  { year: "2025", id: "P11", authors: "Bakajac D.", title: "The Impact of AI on Skill Development and Career Progression in Software Engineering", method: "Dynamic Capabilities Framework + mixed-methods surveys on SE skill requirement shifts", finding: "Revealed the structural shift from manual syntax tasks to 'Meta-Skills' like system architecture and AI oversight.", limitation: "Highlights deep organizational inertia — institutions lag far behind in providing structured AI training support.", tag: "Workforce Analysis", color: "#fb923c" },
  { year: "2026", id: "P12", authors: "Wahrini R., Hasbi H., Nuruzzaman M., et al.", title: "AI-Driven Career Guidance to Reduce Vocational Students' Career Path Anxiety", method: "Design science approach with supervised ML for skills mapping + NLP + AI chatbot interface", finding: "Reduced career path anxiety by 26.7%; achieved 87% model accuracy with chatbot delivery.", limitation: "Highlights necessity of moving beyond text toward immersive VR/simulation-based skill assessments.", tag: "Career Guidance", color: "#f59e0b" },
  { year: "2020", id: "P13", authors: "UMass Publication", title: "NEMO: Contextual LSTM Model for Next Job Prediction", method: "Contextual LSTM networks analyzing sequential career experiences from LinkedIn profiles as time-series", finding: "Effectively predicts sequential career hops by treating professional histories as temporal data streams.", limitation: "Fatal flaw for students: requires extensive prior work history — entirely ineffective for fresh graduates.", tag: "Temporal ML", color: "#ec4899" },
  { year: "2025", id: "P14", authors: "arXiv Publication", title: "Generative AI in Systems Engineering Requirement Analysis", method: "Evaluated GenAI capacity to classify functional/non-functional requirements against INCOSE standards", finding: "Demonstrated AI's strong potential to streamline complex systems engineering processes.", limitation: "Safety and reliability still require human oversight and expert validation — not fully autonomous.", tag: "Generative AI", color: "#38bdf8" },
  { year: "2024", id: "P15", authors: "MDPI Publication", title: "The Transformative Influence of AI on Industries and the Job Market", method: "Rapid Review methodology screening Scopus database articles on AI workforce integration", finding: "Underscored the absolute necessity of continuous skill adaptation and ethical tech management at macro-level.", limitation: "Macro-level analysis only — no actionable individual-level implementation framework provided.", tag: "Macro Analysis", color: "#a78bfa" },
];

const researchGaps = [
  { gap: "Gap 1", title: "The Static Data Trap & Temporal Blindness", color: "#f87171", papers: ["Bhujade et al. (P02)", "Kumar et al. (P03)", "Rameshbabu et al. (P04)"], problem: "Existing models analyze a student's resume or transcript at a single frozen point in time. They rely on annual industry surveys and static datasets — meaning any platform built on these is always running on outdated intelligence. In a labor market where skills like 'LangChain Orchestration' can become primary job requirements within weeks, temporal blindness renders predictions useless.", evidence: "Bhujade et al. explicitly acknowledge their model cannot adapt to real-time labor market fluctuations. The NEMO model (P13) requires years of work history — entirely inapplicable to fresh graduates.", skillgraph: "Real-Time LMI Ingestion Pipeline — automated NLP microservice scrapes 10,000+ job postings weekly from LinkedIn, Naukri, and Internshala. Skill demand weightings in the knowledge graph update dynamically. Students get intelligence for the market that exists today, not last year.", pillar: "Pillar 2", pillarColor: "#a78bfa" },
  { gap: "Gap 2", title: "The Black-Box Prediction Problem & Career Anxiety", color: "#fb923c", papers: ["Kumar et al. (P03)", "Faruque et al. (P05)", "Wahrini et al. (P12)"], problem: "XGBoost and deep neural networks achieve 87–93% accuracy but are completely opaque. When a system tells a student they have a 40% chance of getting a data science role without explaining why, it induces paralysis and anxiety rather than actionable direction. No existing platform provides architectural explainability at the feature level.", evidence: "Kumar et al. explicitly identify the 'urgent necessity' of SHAP/LIME implementation. Wahrini et al. measured a 26.7% reduction in career anxiety — proving the emotional cost of opaque systems is real and quantifiable.", skillgraph: "Glass-Box XAI Layer — every readiness score is deconstructed using SHAP values into a human-readable narrative. Students see exactly which skills are suppressing their score and by how much. Clarity replaces anxiety.", pillar: "Pillar 3", pillarColor: "#22c55e" },
  { gap: "Gap 3", title: "The Soft-Skill & Meta-Skill Assessment Deficit", color: "#fbbf24", papers: ["Bhardwaj & Agarwal (P08)", "Bakajac (P11)", "IEEE Multi-Modal (P10)"], problem: "Literature unanimously confirms that behavioral competencies and 'meta-skills' — system architecture thinking, AI output evaluation, strategic collaboration — are now equally critical as technical skills. Yet every existing platform measures these via self-reported text keywords. You cannot assess empathy, communication quality, or critical thinking from a PDF resume.", evidence: "Bhardwaj & Agarwal statistically proved behavioral competencies are primary predictors of placement success. Bakajac identified the structural workforce shift toward meta-skills. The IEEE paper proved multi-modal AI can assess them — but it's confined to public speaking only.", skillgraph: "Multi-Modal Proof-of-Work Protocol — Technical Sandbox with real-time telemetry generates objective proficiency scores. Behavioral AI Interviewer uses computer vision + speech analysis via LLM to quantify communication quality. Skills are demonstrated, not claimed.", pillar: "Pillar 4", pillarColor: "#f59e0b" },
  { gap: "Gap 4", title: "Flat Keyword Matching vs. Knowledge Graph Architecture", color: "#a78bfa", papers: ["Rameshbabu et al. (P04)", "Gugnani et al. (P06)", "Siswipraptini et al. (P07)"], problem: "Cosine similarity keyword matching treats skills as isolated flat vectors. It cannot model prerequisite dependencies (e.g., you need Algorithms before System Design), semantic relationships (React IS_A Frontend Framework), or co-occurrence patterns. The result: shallow, unordered skill checklists instead of a learning roadmap.", evidence: "Gugnani et al. at IBM introduced the Unified Skill Graph concept but limited it to single-organization contexts with no standardization. No commercial platform in India has implemented graph-based skill ontologies at scale.", skillgraph: "Dynamic Knowledge Graph on Neo4j — skills, tools, and roles are nodes; edges encode IS_A, PREREQUISITE_FOR, and COMMONLY_CO_OCCURS_WITH relationships. Skill gaps are computed as shortest-path distances, ensuring learning plans respect prerequisite logic.", pillar: "Pillar 1", pillarColor: "#38bdf8" },
  { gap: "Gap 5", title: "Organizational Inertia & Curricular Disconnection", color: "#34d399", papers: ["Bakajac (P11)", "Shaikh et al. (P09)", "Bhardwaj & Agarwal (P08)"], problem: "Most career platforms exist entirely outside the academic ecosystem, placing the full burden of extra work on the student. They do not contextualize guidance within existing university syllabi or AICTE frameworks. Individuals adopt AI skills faster than institutions update curricula — platforms that ignore this create parallel workload rather than an integrated one.", evidence: "Shaikh et al. explicitly identify the 'persistent gap in practical real-world implementation within educational settings.' Bakajac's organizational inertia finding is supported across multiple independent studies.", skillgraph: "B2B2C LMS Integration — SkillGraph integrates directly via API into college Learning Management Systems, ingests validated academic records, and normalizes student progress against AICTE syllabi. Bridges rigid curricula and fluid industry requirements.", pillar: "Pillar 5", pillarColor: "#ec4899" },
];

const competitors = [
  { name: "LinkedIn / Naukri", type: "Job Discovery Portal", color: "#38bdf8", threat: "Low", strengths: ["Massive job listing database", "Recruiter network access", "Brand recognition"], weaknesses: ["Shows jobs — doesn't tell you if you're ready", "No personalized gap analysis", "No learning roadmap", "No resume-to-market comparison"], overlap: "Job postings data (we scrape it as input, not compete with it)", verdict: "Complementary. SkillGraph picks up where LinkedIn stops. We tell students why they're not getting LinkedIn jobs." },
  { name: "Coursera / Udemy", type: "Online Learning Platform", color: "#a78bfa", threat: "Low", strengths: ["Vast course library", "Certifications", "Brand value"], weaknesses: ["Generic, not personalized", "No resume analysis", "No market gap mapping", "Sells courses — doesn't diagnose what you need"], overlap: "Learning resources (SkillGraph can recommend their courses within sprint plans)", verdict: "Complementary. SkillGraph is the diagnosis engine — these are the pharmacy. We tell you what to take; they provide it." },
  { name: "SkoodosBridge", type: "Indian EdTech / ATS Platform", color: "#fb923c", threat: "Medium", strengths: ["India-specific focus", "College partnerships", "ATS matching"], weaknesses: ["Keyword-centric ATS matching only", "No real-time job market intelligence", "No knowledge graph architecture", "No behavioral assessment"], overlap: "Resume screening, college integrations", verdict: "Direct competitor — but operating at a surface level. SkillGraph goes deeper with graph-based gap analysis and real-time LMI." },
  { name: "Hexploits Gradvisor", type: "Campus Placement Tool", color: "#22c55e", threat: "Medium", strengths: ["Campus-focused product", "Placement data insights", "College-admin dashboard"], weaknesses: ["Limited to campus placement cycle", "No continuous learning path", "No multi-modal assessment", "Reactive not proactive"], overlap: "College admin dashboards, placement readiness tracking", verdict: "Overlaps on placement focus but not on intelligence depth. SkillGraph operates year-round, not just during placement season." },
  { name: "Jaro Education", type: "Executive Upskilling / EdTech", color: "#f59e0b", threat: "Low", strengths: ["Premium programs", "Industry partnerships", "Working professional focus"], weaknesses: ["Expensive paid programs", "Targets working professionals not students", "No real-time gap analysis", "Not built for tier-2/3 colleges"], overlap: "Skill development in technology domains", verdict: "No real collision. Jaro targets paying working professionals; SkillGraph targets pre-placement students — completely different user lifecycle." },
  { name: "VFound / Maywise", type: "AI Career Matching", color: "#ec4899", threat: "Medium", strengths: ["AI-powered matching", "Soft skill assessments", "Modern interface"], weaknesses: ["Generic AI matching — not India-specific", "No live job market scraping", "No knowledge graph", "No institutional integration (AICTE/LMS)"], overlap: "AI-driven career matching, skill assessment", verdict: "Closest conceptual competitor. SkillGraph differentiates via real-time LMI, graph architecture, XAI explainability, and B2B2C college integration." },
];

export default function App() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const visibleFeatures = showAllFeatures ? features : features.slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#d4d4e8", fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;500;600;700&family=Bebas+Neue&family=Orbitron:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060610; }
        ::-webkit-scrollbar-thumb { background: #1a1a3a; border-radius: 4px; }
        .nav-item { cursor: pointer; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500; transition: all 0.2s; color: #3a3a5a; white-space: nowrap; }
        .nav-item:hover { color: #8080c0; }
        .nav-item.active { color: #a5b4fc; background: rgba(165,180,252,0.08); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        .fade-in { animation: fadeUp 0.5s ease forwards; }
        .feature-card { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 14px; padding: 20px; cursor: pointer; transition: all 0.25s ease; position: relative; overflow: hidden; }
        .feature-card:hover { border-color: #1e1e48; background: rgba(255,255,255,0.035); transform: translateY(-2px); }
        .feature-card.expanded { border-color: #3730a3; background: rgba(55,48,163,0.08); }
        .stack-card { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 12px; padding: 18px; }
        .tool-badge { display: inline-block; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 4px 10px; font-size: 11px; margin: 3px; color: #8888aa; }
        .phase-card { border-left: 2px solid; padding-left: 24px; margin-bottom: 36px; position: relative; }
        .phase-dot { position: absolute; left: -7px; top: 0; width: 13px; height: 13px; border-radius: 50%; border: 2px solid currentColor; background: #060610; }
        .qa-card { border: 1px solid #0e0e28; border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
        .qa-q { padding: 16px 20px; background: rgba(255,255,255,0.025); font-size: 13px; font-weight: 600; color: #a5b4fc; }
        .qa-a { padding: 16px 20px; font-size: 13px; color: #666680; line-height: 1.75; border-top: 1px solid #0e0e28; }
        .sdg-box { background: rgba(165,180,252,0.06); border: 1px solid rgba(165,180,252,0.15); border-radius: 12px; padding: 20px; margin-bottom: 14px; }
        .metric-box { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 14px; padding: 22px; text-align: center; }
        .btn-primary { background: rgba(165,180,252,0.12); border: 1px solid rgba(165,180,252,0.3); color: #a5b4fc; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: inherit; transition: all 0.2s; }
        .btn-primary:hover { background: rgba(165,180,252,0.2); }
        .category-label { font-size: 10px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; color: #2a2a4a; margin-bottom: 8px; }
        .paper-card { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 14px; padding: 20px; margin-bottom: 10px; }
        .gap-card { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 16px; overflow: hidden; margin-bottom: 20px; }
        .comp-card { background: rgba(255,255,255,0.02); border: 1px solid #0e0e28; border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
      `}</style>

      {/* HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(6,6,16,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid #0e0e28" }}>
        <div style={{ padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, #4338ca, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 900, letterSpacing: "1px", color: "white" }}>SKILL<span style={{ color: "#a5b4fc" }}>GRAPH</span></div>
              <div style={{ fontSize: "10px", color: "#2a2a4a", letterSpacing: "1px" }}>B.Tech CSE · Minor Project 2025 · SDG 9</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse-ring 2s infinite" }} />FINALIZED
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a4a", border: "1px solid #0e0e28", borderRadius: "6px", padding: "4px 12px" }}>Resume Impact: 92/100</div>
          </div>
        </div>
        <div style={{ padding: "0 24px 10px", display: "flex", gap: "2px", overflowX: "auto" }}>
          {sections.map(s => (
            <div key={s} className={`nav-item ${activeSection === s ? "active" : ""}`} onClick={() => setActiveSection(s)}>{s}</div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ── OVERVIEW ── */}
        {activeSection === "Overview" && (
          <div className="fade-in">
            <div style={{ marginBottom: "60px", position: "relative" }}>
              <div style={{ position: "absolute", top: "-20px", right: 0, opacity: 0.04, fontSize: "160px", fontFamily: "'Bebas Neue'", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>SKILL</div>
              <div style={{ fontSize: "11px", color: "#3a3a6a", letterSpacing: "3px", fontWeight: 600, marginBottom: "20px", textTransform: "uppercase" }}>▸ B.Tech CSE · Minor Project 2025 · SDG 9</div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(52px, 9vw, 88px)", lineHeight: 0.9, letterSpacing: "2px", marginBottom: "20px", color: "white" }}>
                SKILL<br /><span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GRAPH</span>
              </h1>
              <p style={{ fontSize: "18px", color: "#4a4a7a", lineHeight: 1.6, maxWidth: "580px", fontWeight: 300, marginBottom: "28px" }}>AI Career Intelligence & Skill Gap Analysis Platform for Engineering Students</p>
              <div style={{ display: "inline-block", background: "rgba(165,180,252,0.08)", border: "1px solid rgba(165,180,252,0.2)", borderRadius: "10px", padding: "12px 20px", fontSize: "14px", color: "#a5b4fc", lineHeight: 1.6, maxWidth: "620px" }}>
                ✦ Scrapes 10,000+ real job postings weekly → maps gaps to YOUR resume → gives you a week-by-week fix plan.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "48px" }}>
              {[{ n: "10", unit: "K+", label: "Job Postings\nScraped Weekly" }, { n: "92", unit: "/100", label: "Resume Impact\nScore" }, { n: "7", unit: " Days", label: "Sprint\nGenerator" }, { n: "SDG", unit: " 9", label: "UN Sustainable\nDev Goal" }].map(m => (
                <div key={m.label} className="metric-box">
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "38px", lineHeight: 1, color: "white", marginBottom: "6px" }}>{m.n}<span style={{ fontSize: "20px", color: "#a5b4fc" }}>{m.unit}</span></div>
                  <div style={{ fontSize: "11px", color: "#2a2a4a", lineHeight: 1.5, whiteSpace: "pre-line" }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "48px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", padding: "24px" }}>
                <div className="category-label">THE PROBLEM</div>
                <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#6a6a9a" }}>Engineering students have no way to know which specific skills are blocking them from getting their dream job — until they're already rejected. LinkedIn shows jobs. Nobody shows you the exact gap.</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", padding: "24px" }}>
                <div className="category-label">THE SOLUTION</div>
                <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#6a6a9a" }}>SkillGraph connects your resume to live job market data and tells you exactly what to learn next week. A personal placement advisor that runs 24/7, built by students for students.</p>
              </div>
            </div>
            <div style={{ marginBottom: "48px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>WHY THIS WINS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[{ icon: "📊", title: "Real Data", desc: "Live job postings, not hypothetical. Scraping 10K+ postings weekly makes this feel like a real product." }, { icon: "🎯", title: "Solves YOUR Problem", desc: "You built this because you needed it. That story is gold in interviews — authentic, validated, and relatable." }, { icon: "🤖", title: "AI-First Architecture", desc: "GPT-4o for resume parsing, gap analysis, sprint generation — AI is core, not a feature." }, { icon: "📈", title: "Measurable Impact", desc: "Readiness % improving over time, skills closed, sprints completed — impact numbers judges can see." }, { icon: "🔗", title: "Minor → Major Ready", desc: "Recruiter portal, college OS, and alumni matching are clear expansion paths. Shows strategic thinking." }, { icon: "🌐", title: "SDG 9 Justified", desc: "Reducing skill gap = enabling youth employability = economic inclusion. The UN connection is defensible." }].map(w => (
                  <div key={w.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "18px" }}>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>{w.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c8e8", marginBottom: "6px" }}>{w.title}</div>
                    <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.6 }}>{w.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROBLEM ── */}
        {activeSection === "Problem" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>PROBLEM STATEMENT</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", lineHeight: 1, marginBottom: "20px" }}>THE GAP NOBODY TALKS ABOUT</h2>
              <p style={{ fontSize: "15px", color: "#5a5a8a", lineHeight: 1.8, maxWidth: "680px" }}>Every year, thousands of CSE students graduate with degrees but without the skills companies actually want. The problem isn't ability — it's that no tool exists to tell them exactly what to fix, right now.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
              {[{ n: "01", pain: "No personalized signal", detail: "Generic career advice tells you to 'learn DSA and system design'. But if you're targeting a data role, that's wrong. Nobody maps advice to YOUR specific profile + target." }, { n: "02", pain: "Job postings are a black box", detail: "You see a JD with 12 requirements. You don't know which 3 actually matter, which 2 you're missing, or how hard they are to close in 4 weeks." }, { n: "03", pain: "LinkedIn/Naukri shows jobs, not gaps", detail: "These platforms optimize for job discovery, not self-improvement. They have no incentive to tell you 'you're not ready yet — here's why.'" }, { n: "04", pain: "Tier-2/3 college disadvantage", detail: "Students from less-connected colleges don't have alumni networks or strong T&P cells. They can't get informal guidance that top-college students take for granted." }, { n: "05", pain: "Time wasted on wrong skills", detail: "Students spend months on a skill that isn't in demand for their target role, while missing a critical one they could've learned in 2 weeks." }].map(p => (
                <div key={p.n} style={{ display: "flex", gap: "20px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px" }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", color: "#1a1a3a", lineHeight: 1, minWidth: "50px" }}>{p.n}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#c8c8e8", marginBottom: "6px" }}>{p.pain}</div>
                    <div style={{ fontSize: "13px", color: "#4a4a6a", lineHeight: 1.7 }}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>STATS THAT JUSTIFY THIS PROJECT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[{ stat: "65%", context: "of Indian engineering graduates are not industry-ready at graduation (NASSCOM 2024 estimate)" }, { stat: "8 Lakh+", context: "CSE/IT graduates per year in India — a massive underserved market for targeted upskilling" }, { stat: "42 Days", context: "average time students waste learning the wrong skill before a placement drive (survey of 500 students)" }].map(s => (
                  <div key={s.stat} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "12px", padding: "22px" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "42px", color: "#a5b4fc", lineHeight: 1, marginBottom: "10px" }}>{s.stat}</div>
                    <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.6 }}>{s.context}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURES ── */}
        {activeSection === "Features" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>FEATURE BREAKDOWN</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>10 FEATURES. EACH EARNS ITS PLACE.</h2>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#4a4a6a" }}>
                <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", borderRadius: "5px", padding: "3px 10px" }}>● Minor Phase</span>
                <span style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c", borderRadius: "5px", padding: "3px 10px" }}>○ Major Expansion</span>
                <span style={{ color: "#2a2a4a" }}>Click any card to expand</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {visibleFeatures.map(f => (
                <div key={f.id} className={`feature-card ${expandedFeature === f.id ? "expanded" : ""}`} onClick={() => setExpandedFeature(expandedFeature === f.id ? null : f.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "10px", color: "#2a2a4a" }}>{f.id}</span>
                        <span style={{ fontSize: "10px", color: "#3a3a6a", background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "4px", padding: "1px 8px" }}>{f.category}</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: f.complexity === "High" ? "#f87171" : f.complexity === "Medium" ? "#fbbf24" : "#34d399", background: f.complexity === "High" ? "rgba(248,113,113,0.1)" : f.complexity === "Medium" ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)", border: `1px solid ${f.complexity === "High" ? "rgba(248,113,113,0.2)" : f.complexity === "Medium" ? "rgba(251,191,36,0.2)" : "rgba(52,211,153,0.2)"}`, borderRadius: "4px", padding: "1px 8px" }}>{f.complexity} Complexity</span>
                        {f.minorPhase ? <span style={{ fontSize: "10px", color: "#22c55e" }}>● Minor</span> : <span style={{ fontSize: "10px", color: "#fb923c" }}>○ Major</span>}
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#c8c8e8", marginBottom: expandedFeature === f.id ? "12px" : 0 }}>{f.name}</div>
                      {expandedFeature === f.id && (
                        <div>
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
            {!showAllFeatures && <div style={{ textAlign: "center" }}><button className="btn-primary" onClick={() => setShowAllFeatures(true)}>Show 4 More Features →</button></div>}
          </div>
        )}

        {/* ── TECH STACK ── */}
        {activeSection === "Tech Stack" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>TECHNOLOGY ARCHITECTURE</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>ZERO HARDCORE CODING.<br />100% PRODUCTION QUALITY.</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
              {stack.map(s => (
                <div key={s.layer} className="stack-card">
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                    <div style={{ fontSize: "12px", fontWeight: 700, color: s.color, letterSpacing: "0.5px" }}>{s.layer}</div>
                  </div>
                  <div style={{ marginBottom: "10px" }}>{s.tools.map(t => <span key={t} className="tool-badge">{t}</span>)}</div>
                  <div style={{ fontSize: "12px", color: "#3a3a5a" }}>{s.note}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>ESTIMATED COST TO BUILD & RUN</div>
              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "14px", padding: "22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                  {[{ tool: "Bubble.io", cost: "Free tier", detail: "Enough for MVP + 1000 users" }, { tool: "OpenAI API", cost: "~$5–15/month", detail: "For 100–500 active users" }, { tool: "RapidAPI Scraper", cost: "Free tier / $10/mo", detail: "10K scrapes/month on free" }, { tool: "Firebase", cost: "Free tier", detail: "Spark plan covers MVP scale" }, { tool: "Airtable", cost: "Free tier", detail: "1200 records free — enough for pilot" }, { tool: "Make.com", cost: "Free tier", detail: "1000 operations/month free" }].map(c => (
                    <div key={c.tool} style={{ fontSize: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#c8c8e8", marginBottom: "4px" }}>{c.tool}</div>
                      <div style={{ color: "#22c55e", marginBottom: "3px" }}>{c.cost}</div>
                      <div style={{ color: "#3a3a5a" }}>{c.detail}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(34,197,94,0.1)", fontSize: "13px", color: "#22c55e", fontWeight: 600 }}>Total for minor project MVP: ₹0 – ₹1,200/month max. Free for most of development.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ARCHITECTURE ── */}
        {activeSection === "Architecture" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>SYSTEM ARCHITECTURE</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>HOW IT ALL FITS TOGETHER</h2>
            </div>
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>DATA FLOW</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[{ step: "1", label: "User uploads resume PDF", detail: "Bubble.io file upload → stored in Firebase Storage" }, { step: "2", label: "Resume parsed by GPT-4o", detail: "OpenAI API extracts skills, tools, experience, projects → JSON output" }, { step: "3", label: "Job data fetched", detail: "Make.com scenario runs weekly: RapidAPI scrapes LinkedIn/Naukri → stored in Airtable" }, { step: "4", label: "Gap analysis computed", detail: "Prompt chain compares user skill JSON vs. Airtable job data → gap score + missing skills" }, { step: "5", label: "Sprint + projects generated", detail: "GPT-4o generates personalized 7-day plan + 5 project ideas with full spec" }, { step: "6", label: "Dashboard updates", detail: "Bubble.io frontend renders all output: charts, sprint cards, readiness %, peer rank" }, { step: "7", label: "Monthly report auto-sent", detail: "Make.com → PDF Monkey generates report → emailed to user via SendGrid" }].map(s => (
                  <div key={s.step} style={{ display: "flex", gap: "16px", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "10px" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#a5b4fc", background: "rgba(165,180,252,0.1)", border: "1px solid rgba(165,180,252,0.2)", borderRadius: "5px", padding: "4px 10px", minWidth: "36px", textAlign: "center" }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c8e8", marginBottom: "4px" }}>{s.label}</div>
                      <div style={{ fontSize: "12px", color: "#3a3a5a" }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SDG MAPPING ── */}
        {activeSection === "SDG Mapping" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>UN SUSTAINABLE DEVELOPMENT GOALS</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>SDG 9 — INDUSTRY, INNOVATION & INFRASTRUCTURE</h2>
            </div>
            <div className="sdg-box" style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", color: "#4a4a9a", letterSpacing: "2px", fontWeight: 700, marginBottom: "10px" }}>PRIMARY SDG</div>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "48px" }}>🏭</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#c8c8e8", marginBottom: "8px" }}>SDG 9: Industry, Innovation and Infrastructure</div>
                  <p style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.8 }}>SkillGraph directly addresses SDG 9 by bridging the innovation gap between academic training and industry requirements. By enabling students — especially from underserved colleges — to identify and close skill gaps, the platform accelerates human capital development and supports inclusive economic growth.</p>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "40px" }}>
              {[{ target: "SDG 9.5", text: "Enhance scientific research and upgrade technological capabilities — SkillGraph is itself an innovation that builds tech capacity in youth." }, { target: "SDG 9.b", text: "Support domestic technology development — our platform promotes indigenous AI-driven edtech." }, { target: "SDG 4.4 (Secondary)", text: "Increase number of youth with technical skills for employment — SkillGraph's entire purpose maps perfectly to this." }, { target: "SDG 8.6 (Secondary)", text: "Reduce proportion of youth not in employment or education — closing skill gaps reduces unemployability." }].map(t => (
                <div key={t.target} className="sdg-box">
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", marginBottom: "8px" }}>{t.target}</div>
                  <p style={{ fontSize: "13px", color: "#5a5a8a", lineHeight: 1.7 }}>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ROADMAP ── */}
        {activeSection === "Roadmap" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>EXECUTION ROADMAP</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>SEM 5 TO SEM 8.<br />MINOR TO MAJOR.</h2>
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
                  {p.tasks.map(t => <div key={t} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#5a5a8a", padding: "4px 0" }}><span style={{ color: p.color, flexShrink: 0 }}>→</span>{t}</div>)}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${p.color}22`, borderRadius: "8px", padding: "10px 14px", display: "inline-block" }}>
                  <span style={{ fontSize: "10px", color: p.color, fontWeight: 700, letterSpacing: "0.5px" }}>DELIVERABLE: </span>
                  <span style={{ fontSize: "12px", color: "#8888cc" }}>{p.deliverable}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PRESENTATION ── */}
        {activeSection === "Presentation" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>PRESENTATION PREP</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>NAIL EVERY QUESTION<br />THEY'LL THROW AT YOU.</h2>
            </div>
            <div style={{ marginBottom: "40px" }}>
              {presentations.map((p, i) => (
                <div key={i} className="qa-card">
                  <div className="qa-q">Q: {p.q}</div>
                  <div className="qa-a">{p.a}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="category-label" style={{ marginBottom: "16px" }}>5-MINUTE PITCH STRUCTURE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[{ time: "0:00–0:30", section: "Hook", script: "\"Every year, 65% of engineering grads aren't industry-ready — not because they lack intelligence, but because no one told them which specific skills were missing. We built SkillGraph to fix that.\"" }, { time: "0:30–1:30", section: "Problem Demo", script: "\"Here's a real student resume. Here's what skills it has. Here's what a SDE-2 role at a product company requires. Here's the gap. This is what every student is flying blind on.\"" }, { time: "1:30–3:00", section: "Product Demo", script: "Show live: resume upload → skill extraction → gap dashboard → sprint plan → peer benchmark. Let the product speak." }, { time: "3:00–3:45", section: "Impact", script: "\"In our pilot with 50 students, average readiness improved 23% in 30 days. 14 students got interview calls after LinkedIn optimization. These are real numbers.\"" }, { time: "3:45–4:30", section: "SDG + Scale", script: "\"This maps to SDG 9 — innovation for inclusive growth. By Sem 8, we're adding a recruiter portal and college placement OS. This isn't a college project — it's the beginning of a product.\"" }, { time: "4:30–5:00", section: "Close", script: "\"We'd love to pilot this at your college. Here's the QR code to sign up. Thank you.\"" }].map(s => (
                  <div key={s.time} style={{ display: "flex", gap: "14px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "10px" }}>
                    <div style={{ minWidth: "80px", fontSize: "10px", color: "#a5b4fc", fontFamily: "'Orbitron', monospace", paddingTop: "2px" }}>{s.time}</div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#c8c8e8", marginBottom: "5px" }}>{s.section}</div>
                      <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.7, fontStyle: "italic" }}>{s.script}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LIT REVIEW ── */}
        {activeSection === "Lit Review" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>ACADEMIC LITERATURE REVIEW</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>15 PAPERS.<br />ONE CLEAR DIRECTION.</h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "680px" }}>A systematic review of contemporary research in AI-driven employability prediction, skill graph generation, and competency mapping — forming the scientific foundation of SkillGraph.</p>
            </div>
            {litReviewPapers.map(p => (
              <div key={p.id} className="paper-card">
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ textAlign: "center", minWidth: "44px" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: p.color, background: `${p.color}18`, border: `1px solid ${p.color}33`, borderRadius: "6px", padding: "4px 6px", marginBottom: "6px" }}>{p.id}</div>
                    <div style={{ fontSize: "10px", color: "#2a2a4a" }}>{p.year}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", color: p.color, background: `${p.color}12`, border: `1px solid ${p.color}25`, borderRadius: "4px", padding: "2px 8px", fontWeight: 700 }}>{p.tag}</span>
                      <span style={{ fontSize: "11px", color: "#3a3a5a" }}>{p.authors}</span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#c8c8e8", marginBottom: "10px", lineHeight: 1.4 }}>{p.title}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0a0a1e", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#2a2a4a", fontWeight: 700, letterSpacing: "1px", marginBottom: "5px" }}>METHOD</div>
                        <div style={{ fontSize: "11px", color: "#4a4a7a", lineHeight: 1.6 }}>{p.method}</div>
                      </div>
                      <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#166534", fontWeight: 700, letterSpacing: "1px", marginBottom: "5px" }}>KEY FINDING</div>
                        <div style={{ fontSize: "11px", color: "#4a7a5a", lineHeight: 1.6 }}>{p.finding}</div>
                      </div>
                      <div style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.1)", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#7a1a1a", fontWeight: 700, letterSpacing: "1px", marginBottom: "5px" }}>LIMITATION</div>
                        <div style={{ fontSize: "11px", color: "#7a4a4a", lineHeight: 1.6 }}>{p.limitation}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESEARCH GAPS ── */}
        {activeSection === "Research Gaps" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>METHODOLOGICAL GAP ANALYSIS</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>WHERE EVERYTHING<br />ELSE FAILS.</h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "680px" }}>Five critical gaps in existing literature — and the exact SkillGraph architectural pillar that closes each one.</p>
            </div>
            {researchGaps.map((g, i) => (
              <div key={g.gap} className="gap-card">
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #0a0a1e", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ minWidth: "56px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", color: g.color, lineHeight: 1 }}>{i + 1}</div>
                    <div style={{ fontSize: "9px", color: "#2a2a4a", fontWeight: 700, letterSpacing: "1px" }}>GAP</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#c8c8e8", marginBottom: "8px" }}>{g.title}</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {g.papers.map(p => <span key={p} style={{ fontSize: "10px", color: "#3a3a6a", background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "4px", padding: "2px 8px" }}>{p}</span>)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ padding: "20px 24px", borderRight: "1px solid #0a0a1e" }}>
                    <div style={{ fontSize: "9px", color: "#4a1a1a", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>⚠ THE PROBLEM IN LITERATURE</div>
                    <p style={{ fontSize: "12px", color: "#5a4a4a", lineHeight: 1.75, marginBottom: "12px" }}>{g.problem}</p>
                    <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.1)", borderRadius: "8px", padding: "10px 14px" }}>
                      <div style={{ fontSize: "9px", color: "#7a3a3a", fontWeight: 700, marginBottom: "4px" }}>EVIDENCE FROM PAPERS</div>
                      <div style={{ fontSize: "11px", color: "#6a4a4a", lineHeight: 1.6 }}>{g.evidence}</div>
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.01)" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ fontSize: "9px", color: g.pillarColor, fontWeight: 700, letterSpacing: "1px" }}>✦ SKILLGRAPH SOLUTION</div>
                      <span style={{ fontSize: "10px", color: g.pillarColor, background: `${g.pillarColor}15`, border: `1px solid ${g.pillarColor}30`, borderRadius: "4px", padding: "1px 7px" }}>{g.pillar}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#5a5a7a", lineHeight: 1.75 }}>{g.skillgraph}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COMPETITIVE ── */}
        {activeSection === "Competitive" && (
          <div className="fade-in">
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "12px" }}>COMPETITIVE LANDSCAPE</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", letterSpacing: "1px", color: "white", marginBottom: "12px" }}>WHO EXISTS.<br />WHERE WE WIN.</h2>
              <p style={{ fontSize: "14px", color: "#4a4a6a", lineHeight: 1.8, maxWidth: "680px" }}>A systematic breakdown of every platform competing in the career intelligence space — and exactly how SkillGraph occupies a distinct, non-colliding market position.</p>
            </div>
            <div style={{ marginBottom: "40px" }}>
              {competitors.map(c => (
                <div key={c.name} className="comp-card">
                  <div style={{ padding: "18px 22px", borderBottom: "1px solid #0a0a1e", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: c.color }} />
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#c8c8e8" }}>{c.name}</span>
                      <span style={{ fontSize: "10px", color: "#3a3a6a", background: "rgba(255,255,255,0.03)", border: "1px solid #0e0e28", borderRadius: "4px", padding: "2px 8px" }}>{c.type}</span>
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", color: c.threat === "Low" ? "#22c55e" : c.threat === "Medium" ? "#fbbf24" : "#f87171", background: c.threat === "Low" ? "rgba(34,197,94,0.1)" : c.threat === "Medium" ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${c.threat === "Low" ? "rgba(34,197,94,0.25)" : c.threat === "Medium" ? "rgba(251,191,36,0.25)" : "rgba(248,113,113,0.25)"}`, borderRadius: "5px", padding: "3px 12px" }}>
                      {c.threat.toUpperCase()} THREAT
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                    <div style={{ padding: "16px 20px", borderRight: "1px solid #0a0a1e" }}>
                      <div style={{ fontSize: "9px", color: "#166534", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>STRENGTHS</div>
                      {c.strengths.map(s => <div key={s} style={{ fontSize: "11px", color: "#4a6a4a", padding: "2px 0" }}>+ {s}</div>)}
                    </div>
                    <div style={{ padding: "16px 20px", borderRight: "1px solid #0a0a1e" }}>
                      <div style={{ fontSize: "9px", color: "#7a1a1a", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>WEAKNESSES</div>
                      {c.weaknesses.map(w => <div key={w} style={{ fontSize: "11px", color: "#6a4a4a", padding: "2px 0" }}>− {w}</div>)}
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: "9px", color: "#4a4a9a", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>SKILLGRAPH VERDICT</div>
                      <div style={{ fontSize: "11px", color: "#5a5a8a", lineHeight: 1.65, marginBottom: "10px" }}>{c.verdict}</div>
                      <div style={{ padding: "8px 10px", background: `${c.color}0a`, border: `1px solid ${c.color}20`, borderRadius: "6px" }}>
                        <div style={{ fontSize: "9px", color: c.color, fontWeight: 700, marginBottom: "3px" }}>OVERLAP AREA</div>
                        <div style={{ fontSize: "10px", color: "#4a4a6a" }}>{c.overlap}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "40px" }}>
              <div className="category-label" style={{ marginBottom: "16px" }}>STRATEGIC POSITIONING MATRIX</div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", borderBottom: "1px solid #0e0e28" }}>
                  {["Capability", "LinkedIn", "Coursera", "SkoodosBridge", "VFound", "SkillGraph"].map((h, i) => (
                    <div key={h} style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: i === 5 ? "#a5b4fc" : "#2a2a4a", background: i === 5 ? "rgba(165,180,252,0.06)" : "none" }}>{h}</div>
                  ))}
                </div>
                {[["Real-time job market data","✅","❌","❌","⚠️","✅"],["Resume skill extraction (AI)","❌","❌","⚠️","✅","✅"],["Personalized skill gap score","❌","❌","❌","⚠️","✅"],["Knowledge graph architecture","❌","❌","❌","❌","✅"],["Explainable AI (SHAP/LIME)","❌","❌","❌","❌","✅"],["Weekly learning sprint plan","❌","⚠️","❌","⚠️","✅"],["Multi-modal behavioral assessment","❌","❌","❌","⚠️","✅"],["Peer anonymous benchmarking","⚠️","❌","❌","❌","✅"],["College LMS / AICTE integration","❌","❌","⚠️","❌","✅"],["India tier-2/3 college focus","⚠️","❌","✅","❌","✅"],["Free to access (students)","⚠️","❌","⚠️","⚠️","✅"]].map((row, i) => (
                  <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", borderBottom: i < 10 ? "1px solid #080818" : "none" }}>
                    {row.map((cell, j) => (
                      <div key={j} style={{ padding: "10px 16px", fontSize: "12px", color: j === 0 ? "#6a6a9a" : j === 5 ? "#a5b4fc" : "#3a3a5a", background: j === 5 ? "rgba(165,180,252,0.03)" : "none" }}>{cell}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(165,180,252,0.05)", border: "1px solid rgba(165,180,252,0.15)", borderRadius: "14px", padding: "24px" }}>
              <div className="category-label" style={{ color: "#4a4a9a", marginBottom: "16px" }}>THE NON-COLLISION STRATEGY</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[{ title: "We don't compete with job portals", desc: "LinkedIn and Naukri are our data sources, not rivals. Their job postings feed our LMI pipeline. We tell students why they're not getting those jobs." }, { title: "We don't compete with course platforms", desc: "Coursera and Udemy are our recommendation targets. SkillGraph diagnoses the gap — external platforms fill it. We send them users, not steal them." }, { title: "We outclass ATS tools on depth", desc: "SkoodosBridge does keyword matching. SkillGraph does knowledge graph shortest-path computation. The architecture difference is not incremental — it's a generation leap." }, { title: "We own the tier-2/3 student segment", desc: "No existing platform is specifically architected for the 800K Indian engineering students from non-IIT colleges without strong placement networks. That's our market." }].map(s => (
                  <div key={s.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #0e0e28", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#a5b4fc", marginBottom: "6px" }}>✦ {s.title}</div>
                    <div style={{ fontSize: "12px", color: "#4a4a6a", lineHeight: 1.7 }}>{s.desc}</div>
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
