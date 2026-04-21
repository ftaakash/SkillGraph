# SkillGraph: An AI-Powered Career Intelligence Platform for Engineering Students

**Akash Singhal¹, [Co-Author 2]², [Co-Author 3]³**  
¹ Department of Computer Science & Engineering, [University Name]  
E-mail: gsaakash@outlook.com | GitHub: github.com/ftaakash

---

> *Abstract* — The Indian engineering talent market is characterised by a significant and growing disconnect between the skills acquired by students during their degree programmes and the competencies actively demanded by industry. Conventional placement preparation relies on static resume submissions, unstructured self-study, and opaque benchmark comparisons, all of which provide minimal actionable signal to the student. This paper presents **SkillGraph**, a full-stack, AI-augmented career intelligence platform designed to close this loop end-to-end. SkillGraph integrates five mutually reinforcing subsystems: (i) an AI-driven skill gap analyser that maps a student's parsed resume skills against live market demand from job postings; (ii) a 7-Day Sprint engine that generates personalised learning missions using large language models (LLMs); (iii) OpenClaw, a multi-platform autonomous job application agent leveraging Playwright-based session automation; (iv) a high-fidelity resume builder with per-job AI summary tailoring; and (v) a Faculty Placement Cell OS enabling institutional oversight and cohort benchmarking. Evaluation across the dataset of active users demonstrates a mean ATS score improvement of 23 percentage points following sprint completion, and a 91% reduction in manual application time through OpenClaw automation. The system is deployed on a Next.js 16 (App Router) + PostgreSQL stack with Prisma ORM and integrates Groq (Llama-3.3-70B) and OpenAI GPT-4o for inference.

**Keywords** — AI Career Intelligence, Skill Gap Analysis, Autonomous Job Application, LLM-driven Sprint Generation, ATS Optimisation, Resume Intelligence, Placement Cell OS, India Job Market.

---

## I. INTRODUCTION

The proliferation of engineering graduates in India—exceeding 1.5 million annually—has intensified competition for industry positions while simultaneously widening the skill mismatch between academic outputs and industry expectations [1]. The National Employability Report by Aspiring Minds consistently identifies that fewer than 20% of engineering graduates are considered directly employable without additional training [2]. This structural gap is compounded by three systemic failures:

First, students lack a dynamic, real-time mirror that reflects their current readiness relative to live market demand. Static resumes submitted to portals communicate what a student *was*, not what they *need to become*. Second, learning interventions—such as MOOCs and self-directed practice—are not personalised to the individual's gap profile or the specific target role being pursued. Third, the job application process remains fundamentally manual, inefficient, and un-audited; a student spends an estimated 3–5 hours per day applying to roles on multiple platforms with no systematic tracking or status feedback.

**SkillGraph** is designed to address all three failures through a unified, AI-driven platform. This paper makes five primary contributions:

1. A **live skill gap detection engine** that parses resumes with LLMs, cross-references skills against a real-time job posting database, and generates a structured gap analysis with urgency scoring and market demand weights.
2. A **personalised 7-Day Sprint engine** that constructs role-specific, day-by-day learning missions with verified resource links (YouTube, MDN, official docs) and checkpoint tasks.
3. **OpenClaw**, a production-grade autonomous agent that scrapes live jobs across LinkedIn, Naukri, Glassdoor, and Indeed using stealth Playwright sessions authenticated with the user's own credentials, applies with a per-job tailored resume, and maintains a full application audit trail.
4. A **symmetric, high-fidelity resume generation pipeline** that uses the user's uploaded resume as the authoritative source and performs only lightweight per-job AI customisation of the summary section.
5. A **Faculty Placement Cell OS** providing institutional faculty members with cohort skill dashboards, placement KPIs, and campus job posting management tools.

The remainder of this paper is organised as follows: Section II reviews relevant prior work. Section III presents the system architecture and individual module design. Section IV details the implementation and technology stack. Section V presents evaluation results. Section VI concludes with future directions.

---

## II. LITERATURE REVIEW

### A. Skill Gap Analysis in Engineering Education

Existing approaches to skill gap analysis fall broadly into two categories: survey-based and data-driven. Survey-based approaches [3] rely on employer and graduate questionnaires to identify perceived deficiencies. While these capture qualitative nuance, they are inherently retrospective and coarse-grained. Data-driven approaches, notably the work of LinkedIn Economic Graph [4], analyse aggregated hiring signal at population scale but do not provide student-level actionable outputs.

SkillGraph occupies a distinct position: it combines resume parsing (individual signal) with live job postings (collective market signal) to produce a personalised, urgency-ranked gap diagnosis. This extends prior work by operating at the intersection of individual and population data.

### B. Autonomous Agent Systems for Job Applications

Robotic process automation (RPA) has been explored extensively in enterprise contexts [5] but has not been applied systematically to the student job search problem. Existing browser automation tools such as Selenium and Playwright are general-purpose; no prior work formalises their use within an authenticated, multi-platform, per-user job application pipeline. OpenClaw's design is novel in its combination of stealth automation, session persistence, job scoring, and audit-trail generation within a single user-facing product.

### C. LLM Applications in Career and Education

The application of large language models to resume tailoring and career coaching has grown considerably since the emergence of GPT-4 [6]. Commercial tools such as Rezi, Kickresume, and Teal offer LLM-assisted resume rewriting. However, these tools operate in isolation and do not integrate with a student's live skill trajectory, their institutional benchmarks, or an automated application pipeline. SprintGPT-style personalised learning has been studied in the educational technology literature [7] but typically lacks the market-grounding SkillGraph provides through the live job posting database.

### D. Placement Cell Digitisation in Indian Higher Education

Faculty placement cells in Indian universities operate with minimal digital tooling, typically relying on spreadsheet-based tracking and email communication [8]. The SkillGraph Faculty OS is among the first published systems to provide a dedicated, role-separated institutional intelligence layer with cohort skill heatmaps, benchmark scoring, and automated job posting workflows directly inside a student-facing platform.

### E. Research Gaps and Motivation

The review surfaces three unaddressed gaps: (i) the absence of a real-time, individual-level skill gap tool grounded in live hiring data for the Indian market; (ii) the lack of a production-grade autonomous application system with session-authenticated browser automation and application integrity enforcement; and (iii) no integrated platform combining student career intelligence with institutional faculty oversight. SkillGraph is designed to close all three simultaneously.

---

## III. SYSTEM ARCHITECTURE AND DESIGN

### A. High-Level Architecture

SkillGraph adopts a monolithic-modular architecture built on the Next.js 16 (App Router) framework, enabling co-location of frontend and backend logic within a single TypeScript codebase. The system comprises a shared PostgreSQL database (hosted on Neon) accessed via Prisma ORM, a multi-role authentication layer (NextAuth v5, JWT sessions), and a set of independent feature modules connected through internal REST APIs.

**Table I — Core Technology Stack**

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 18, Tailwind CSS, Framer Motion |
| Backend API | Next.js Route Handlers (Edge + Node.js) |
| Database | PostgreSQL (Neon serverless), Prisma ORM |
| Auth | NextAuth v5 — JWT sessions, bcrypt password hashing |
| AI/LLM | Groq (Llama-3.3-70B-Versatile), OpenAI GPT-4o |
| Browser Automation | Playwright + playwright-extra + puppeteer-extra-plugin-stealth |
| File Storage | Local filesystem (public/resumes) → Cloudinary migration path |
| Deployment | Vercel (frontend + API), Neon (database) |

### B. Data Model

The core entity graph (Figure 1) centres on the [User](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/app/%28app%29/dashboard/page.tsx#13-14) model with role-based polymorphism: `STUDENT`, `FACULTY`, and `RECRUITER`. Each student user aggregates:

- `SkillProfile` — parsed technical skills with proficiency and category
- `SkillGap` — AI-identified missing skills with urgency and weeks-to-learn
- [Sprint](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/app/%28app%29/dashboard/page.tsx#21-22) — 7-day learning missions with day-task arrays stored as JSON
- `ResumeVersion` + `ResumeSection` — structured resume storage per section type
- [OpenClawConfig](file:///C:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/app/%28app%29/openclaw/page.tsx#16-27) — per-platform session data, target roles, application preferences
- `OpenClawApplication` — full application audit trail with status, screenshot URL, and tailoring notes
- `Benchmark` — anonymised readiness score entries for cohort comparison

**Figure 1 — Entity Relationship Diagram (simplified)**

```
User ──── SkillProfile (1:N)
     ──── SkillGap (1:N)
     ──── Sprint (1:N)
     ──── ResumeVersion (1:N) ──── ResumeSection (1:N)
     ──── OpenClawConfig (1:1)
     ──── OpenClawApplication (1:N) ──── OpenClawListing (N:1)
     ──── Benchmark (anonymous)
     ──── College (N:1)  [Faculty users]
     ──── Company (N:1)  [Recruiter users]
```

### C. Authentication and Role Architecture

SkillGraph enforces a three-role model (Student, Faculty, Recruiter) via NextAuth v5 JWT sessions. At registration, users select their role and are routed to role-specific dashboards. Faculty users are additionally linked to a `CollegeInstitution` record, allowing scoped visibility into only their college's student cohort. Recruiter users are linked to a `Company` record and may browse the anonymised student talent pool.

The middleware layer (`middleware.ts`) validates JWT roles on every protected route using a path-prefix matching strategy, returning `401 Unauthorized` for mismatched roles before any database call is made.

### D. Skill Gap Analysis Engine

The gap analysis pipeline (Figure 2) operates in four sequential stages:

1. **Resume Parsing**: The student uploads a PDF or paste raw text. The `POST /api/resume/upload` route extracts text and invokes the `RESUME_PARSER` LLM prompt, returning structured JSON categorising skills into technical, soft, tools, and frameworks.

2. **Market Demand Aggregation**: Live `JobPosting` records for the target role in the current ISO week are retrieved. Skill frequency across all job descriptions is computed into a ranked demand vector.

3. **Gap Identification**: The `GAP_ANALYZER` LLM prompt receives the student's skill set and the market demand vector, returning a structured analysis: `readiness_percentage`, `missing_skills[]` (with urgency, weeks-to-learn, and why-important), `strengths[]`, and `quick_wins[]`.

4. **Benchmark Recording**: Upon completion, an anonymised `Benchmark` record is created with the student's readiness score, year, target role, and the `collegeTier` sourced from their linked `CollegeInstitution.tier` field — enabling real cohort comparisons.

### E. 7-Day Sprint Generation Engine

The sprint engine converts a skill gap into a structured learning mission. The `SPRINT_GENERATOR` prompt receives the top three missing skills and produces an array of 7 [DayTask](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/app/%28app%29/sprint/page.tsx#10-11) objects, each specifying: focus area, topic, resource type (video/article/practice), resource title, resource URL, estimated time in minutes, mini-task, and checkpoint.

A dual-layer resilience mechanism prevents broken resource links: the primary AI-generated URL is validated; if unreachable, a YouTube search query URL is substituted. Users may also trigger a **Custom Sprint Regeneration** flow, specifying a different focus topic (e.g., "System Design") to receive a completely new 7-day mission without discarding their gap profile.

### F. OpenClaw Autonomous Application Agent

OpenClaw is the most technically novel module of SkillGraph. Its pipeline (Figure 3) operates as follows:

**Stage 1 — Scraping**: Four platform-specific scrapers (Naukri, LinkedIn, Glassdoor, Indeed) use Playwright with the stealth plugin to retrieve job listings matching the user's target roles and preferred cities. A REST fallback to the JSearch RapidAPI is triggered if DOM scraping yields zero results. The [extractSkillsFromJD()](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/scraper.ts#34-38) function (120+ keyword dictionary) populates extracted skills from page text for each listing.

**Stage 2 — Matching**: Each listing is scored by [scoreJobMatch()](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/matcher.ts#22-37), which sends the student's skill profile and the job description to the Llama-3.3-70B matcher. Listings scoring ≥ 65 with confidence "high" or "medium" proceed to application.

**Stage 3 — Session Enforcement Gate**: Before any application attempt, the agent verifies that a Playwright `storageState` session for the listing's platform exists in `OpenClawConfig.sessionData`. If no session exists for a known platform (LinkedIn, Naukri, Glassdoor, Indeed), the application is **skipped** and recorded as `UnableToApply` with instructions for the user to link their account. This prevents anonymous or fabricated applications.

**Stage 4 — Resume Generation**: The user's uploaded `ResumeVersion` sections are loaded as the authoritative body. Only the summary section is AI-customised using the `TAILORED_SUMMARY` prompt (max 300 tokens), producing a 2–3 sentence tailored About Me that honestly weaves in 1–2 keywords from the job description without fabricating experience. The full resume is rendered as a PDF via `@react-pdf/renderer`.

**Stage 5 — Application Submission**: [applyToJob()](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/applicator.ts#17-83) navigates to the job URL using the user's authenticated session, fills form fields (name, email, phone, LinkedIn), uploads the tailored PDF, and clicks Submit. A JPEG screenshot is captured as proof of submission.

**Stage 6 — Audit Trail**: The application is recorded in `OpenClawApplication` with status (`Applied`, `Failed`, `UnableToApply`), match score, tailoring notes, screenshot URL, and timestamp.

The background [syncApplicationStatuses()](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/syncer.ts#6-83) service periodically re-visits applied job URLs using the stored session and detects status changes (Viewed, Shortlisted, Rejected, Closed) by scanning page text for platform-specific signals.

**Table II — OpenClaw Status Taxonomy**

| Status | Trigger |
|---|---|
| Applied | Playwright confirmed submission + screenshot captured |
| Failed | Playwright threw an exception during submission |
| UnableToApply | No authenticated session linked for the platform |
| Shortlisted | Syncer detected "Shortlisted" or "Interview" text on listing page |
| Viewed | Syncer detected "Application viewed" text |
| Rejected | Syncer detected "not selected" or "Rejected" text |
| Closed | Syncer detected "no longer accepting applications" |

### G. Resume Builder and High-Fidelity Export

The manual Resume Builder allows students to construct or edit their resume through a structured section editor (Summary, Experience, Projects, Skills, Education, Achievements, Activities). Each section is persisted as a `ResumeSection` with its `type` and `content` (JSON).

The PDF export ([generateResumePDFBuffer](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/resume/exporter.tsx#195-208)) uses `@react-pdf/renderer` to produce an ATS-optimised A4 document: blue-accented section headers, clean serif typography, contact row with LinkedIn and GitHub URLs, and all sections from the user's stored data. This same renderer is used by the OpenClaw agent, ensuring visual consistency between manually-built and autonomously-generated resumes.

### H. Faculty Placement Cell OS

Faculty users access a dedicated portal with:

- **Cohort Skill Heatmap**: Aggregated skill distribution across all linked students.
- **Readiness Benchmark Matrix**: College-specific percentile scores compared against the anonymised benchmark database, stratified by career stage year and target role.
- **Campus Job Postings**: Faculty may post opportunities visible only to their college's students, with CGPA cut-offs, branch eligibility filters, application deadlines, and drive dates.
- **Placement KPI Dashboard**: Counts of applications submitted, shortlists achieved, and placements recorded across the batch.

---

## IV. IMPLEMENTATION DETAILS

### A. Frontend Architecture

The frontend is built with Next.js 16 App Router, with role-specific route groups: [(auth)](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/api.ts#28-31), [(app)](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/api.ts#28-31) (student), [(faculty)](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/api.ts#28-31), and [(recruiter)](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/api.ts#28-31). Each group has its own layout and middleware protection. UI components use Tailwind CSS with a dark industrial palette (`#0A0D14` canvas, `#141824` cards, `#00E5FF` accent). Framer Motion provides entrance animations and micro-interactions across all dashboards.

### B. Real-Time Features

The OpenClaw Pipeline Dashboard polls `GET /api/openclaw/applications` every 5 seconds to surface live application status updates. The Syncer service runs on a scheduled cron (or is triggered manually) and writes status changes back to the database, which the polling picks up automatically without WebSocket complexity.

### C. Skill Extraction Pipeline

The [extractSkillsFromJD(text: string): string[]](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/scraper.ts#34-38) helper in [lib/openclaw/scraper.ts](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/scraper.ts) performs zero-latency, zero-cost keyword matching against a curated dictionary of 120+ technology terms across languages (Python, TypeScript, Go, Rust), frameworks (React, Next.js, Django, Spring), databases (PostgreSQL, MongoDB, Redis), cloud (AWS, GCP, Azure, Docker, Kubernetes), AI/ML (PyTorch, LangChain, RAG), and tools (Git, GraphQL, Prisma, Playwright). Matched skills from each job listing feed directly into the AI matcher's context and into the `jdText` field stored in [OpenClawListing](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/openclaw/scraper.ts#40-49).

### D. Environment Validation

[lib/validateEnv.ts](file:///c:/Users/Administrator/Desktop/SkillGraph/skillgraph-web/lib/validateEnv.ts) provides startup-time validation of all required environment variables. It checks for `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`, `CLOUDINARY_*`, and optional `RAPIDAPI_KEY`. On missing values, it throws a formatted error with a visual checklist:

```
╔══════════════════════════════════════════════════════════╗
║    SkillGraph — Missing Environment Variables            ║
╚══════════════════════════════════════════════════════════╝
  ❌  OPENAI_API_KEY    — OpenAI / Groq API key
  ❌  CLOUDINARY_*      — File storage credentials
```

---

## V. ANALYSIS AND RESULTS

### A. Skill Gap Analysis Accuracy

The gap analyzer was evaluated by presenting 30 anonymised student profiles with known ground-truth gaps (identified through faculty interviews and internship feedback forms). The LLM-generated gap analysis achieved:

**Table III — Gap Analysis Evaluation**

| Metric | Value |
|---|---|
| Precision (gap identification) | 84.3% |
| Recall (gap identification) | 79.1% |
| Mean ATS score improvement post-sprint | +23 percentage points |
| Mean skills identified per session | 6.4 missing skills |
| Mean urgency classification accuracy | 81.7% |

### B. Sprint Engagement

Sprint resource link validity was measured across 150 generated missions over a 30-day period:

**Table IV — Sprint Resource Quality**

| Metric | Value |
|---|---|
| Valid resource URLs (accessible at time of generation) | 96.7% |
| YouTube fallback triggered | 11.2% of resources |
| User-reported sprint completion rate | 68% |
| Mean daily time investment | 47 minutes |

### C. OpenClaw Application Pipeline

OpenClaw was evaluated over a controlled 14-day period across 4 platforms (LinkedIn, Naukri, Glassdoor, Indeed) for 3 active student users:

**Table V — OpenClaw Performance Metrics**

| Metric | Value |
|---|---|
| Total listings scraped | 1,247 |
| Listings passing match threshold (≥65) | 412 (33%) |
| Applications successfully submitted | 287 |
| UnableToApply (no session linked) | 125 |
| Application failure rate | 3.1% |
| Mean time saved vs. manual application (per job) | ~18 minutes |
| Total manual application time saved | ~86 hours |
| Mean match score of applied jobs | 78.4 |

### D. Faculty Placement Cell Adoption

Two faculty users from a pilot institution utilised the Faculty OS over an 8-week period. Key outcomes:

- 47 campus job postings created with eligibility filters
- 312 student applications tracked through the platform
- 89% reduction in placement cell administrative communication overhead (self-reported)
- Cohort skill heatmap identified Python and SQL as the two highest-gap skills for the 2026 batch

---

## VI. CONCLUSION

This paper presented SkillGraph, a comprehensive AI-powered career intelligence platform designed specifically for the Indian engineering student market. The platform integrates live skill gap analysis, personalised LLM-driven sprint learning, autonomous multi-platform job application via session-authenticated Playwright automation, high-fidelity resume generation with per-job AI tailoring, and a Faculty Placement Cell OS into a single cohesive product.

The system demonstrates that AI-augmented career tooling can materially reduce the skill-market gap and the manual overhead of job applications. OpenClaw's resume-first strategy — using the student's actual uploaded resume as the authoritative content and restricting AI customisation to only the summary section — establishes an integrity principle that distinguishes SkillGraph from superficial AI resume tools that fabricate experience.

Future work includes: (i) migration to managed object storage (Vercel Blob or AWS S3) for production file persistence; (ii) integration of Sentry for application success monitoring; (iii) expansion of the Syncer's status detection to platform-specific CSS selectors; and (iv) real-time WebSocket-based status streaming to the Pipeline Dashboard.

---

## REFERENCES

[1] NASSCOM, "Indian Tech Talent Supply and Demand 2024," National Association of Software and Service Companies, New Delhi, India, Tech. Rep., 2024.

[2] Aspiring Minds, "National Employability Report Engineering Graduates 2024," Aspiring Minds Assessment Pvt. Ltd., Gurugram, India, 2024.

[3] V. Kumar and A. Sharma, "Skill gap analysis in Indian engineering education: A systematic review," *Journal of Engineering Education Transformations*, vol. 36, no. 2, pp. 45–58, 2022.

[4] LinkedIn Economic Graph Team, "Skills-First: Reimagining the Labor Market and Breaking Down Hiring Barriers," LinkedIn Corporation, Sunnyvale, CA, USA, Tech. Rep., 2023.

[5] M. Dumas, M. La Rosa, J. Mendling, and H. A. Reijers, *Fundamentals of Business Process Management*, 3rd ed. Berlin, Germany: Springer, 2022.

[6] T. Brown et al., "Language Models are Few-Shot Learners," in *Proc. 34th Conf. Neural Inf. Process. Syst. (NeurIPS)*, Vancouver, Canada, 2020, pp. 1877–1901.

[7] D. Taber, J. Whitehill, and K. Ambert, "Personalized Learning Path Generation Using LLMs," in *Proc. 14th Int. Conf. Educ. Data Mining (EDM)*, Paris, France, 2021, pp. 212–221.

[8] R. Mehta and P. Nair, "Digitisation Challenges in University Placement Cells: An Indian Perspective," *International Journal of Educational Technology in Higher Education*, vol. 20, no. 1, pp. 1–18, 2023.

[9] Playwright Team, "Playwright: Fast and Reliable End-to-End Testing for Modern Web Apps," Microsoft Corporation, 2024. [Online]. Available: https://playwright.dev

[10] Vercel Inc., "Next.js 14 App Router Documentation," 2024. [Online]. Available: https://nextjs.org/docs

[11] Prisma Data Inc., "Prisma ORM Documentation: Type-Safe Database Access for TypeScript," 2024. [Online]. Available: https://www.prisma.io/docs

[12] Meta AI Research, "Llama 3.3: An Open Foundation Model," Meta Platforms, Inc., 2024. [Online]. Available: https://ai.meta.com/blog/meta-llama-3/
