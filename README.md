<div align="center">

# SkillGraph

**AI career and placement platform for Indian engineering students, placement cells and recruiters**

Find your skill gaps against live job demand, close them with focused sprints, track academics and placement drives,
and apply with a résumé tailored to every job.

[![Live](https://img.shields.io/badge/Live-skillgraphai.vercel.app-111111?style=for-the-badge&logo=vercel)](https://skillgraphai.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs)
![Postgres](https://img.shields.io/badge/Postgres_·_Prisma-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Status](https://img.shields.io/badge/Status-Pre--launch-FFB020?style=for-the-badge)

[Features](#-features) · [Gallery](#-gallery) · [Architecture](#-architecture) · [Tech stack](#-tech-stack) · [Run locally](#-run-locally) · [Roadmap](#-roadmap) · [Decision records](#-decision-records)

<br/>

<img src="docs/screenshots/landing.webp" width="860" alt="SkillGraph landing page"/>

</div>

---

## ✨ At a glance

| For students | For placement cells | For recruiters |
|---|---|---|
| Skill-gap analysis, 7-day sprints, résumé builder, Smart Apply (auto-apply) with a browser extension, academics and attendance planning, campus drives with round-by-round tracking | An isolated college workspace: drives and hiring rounds, check-in, notices, drive chats, CSV imports, cohort analytics and placement reports | Anonymous skill-based talent discovery, a shortlist, and contact details shared only after the student accepts |

---

## 🚀 Features

### 🎯 Career intelligence
- **Skill-gap analysis.** Your résumé's skills are compared with what recent postings for your target role ask for. Gaps are ranked by urgency, ignoring skills you have by implication (React ⇒ HTML/CSS) and alternative stacks you don't need.
- **7-day sprints.** A day-by-day plan with free resources, a mini task and a checkpoint for each day. It is built from your most urgent gaps or from topics you choose. Progress is saved per day.
- **Market intelligence.** Weekly skill demand by role, live job search and salary lookups (JSearch), and an India market view by city and company tier.
- **Benchmark.** See where your readiness sits against students targeting the same role, nationally and in your college.
- **Project ideas, LinkedIn optimiser and India career advisor.** AI suggestions grounded in your own skills and gaps.

### 🤖 Smart Apply — auto-apply ([ADR-004](docs/adr/ADR-004-openclaw-auto-apply.md))
<sub>Formerly called OpenClaw; the code, API routes and database still use `openclaw` names.</sub>

- **Your filters decide.** Target roles, cities or remote, minimum CTC (reads "8-12 LPA", "6.5 Lacs P.A.", monthly pay), blocked companies, must-mention and skip keywords. Nothing outside them is prepared or submitted automatically.
- **A full résumé tailored to each job,** rebuilt from your uploaded résumé. It never invents employers, projects, numbers or skills.
- **Auto-submit (opt-in)** through the employer's own Greenhouse or Lever API, for employers who connect their hiring system to SkillGraph. If a form asks something only you can answer, it waits for you.
- **Browser extension** for LinkedIn, Naukri, Glassdoor and Superset ([`extension/`](extension/README.md)). It checks the job against your filters, tailors the résumé and fills the application form in your own browser. You press Submit.
- **10-dimension fit evaluation** for any job link or pasted description, with one click to tailor your résumé to it, plus a STAR story bank and salary-negotiation scripts that use placeholders instead of invented facts.
- **A clear pipeline:** every application shows whether it was submitted for you, via the extension or by you, and why one wasn't auto-submitted (e.g. "the form asks your expected CTC").
- **Never** logs in to job sites from our servers and never stores your passwords, cookies or session tokens for them.

### 📝 Résumé builder
- Generate a draft tailored to a job description from your uploaded résumé. "AI Enhance" rewrites one section at a time without adding facts.
- ATS score with a breakdown (keywords, format, quantification, action verbs, completeness), saved versions, and PDF export.
- Files are stored privately and downloaded through short-lived signed links.

### 🎓 Academics ([ADR-002](docs/adr/ADR-002-academics-and-placement-drives.md))
- **Attendance that tells you what to do.** For each course: how many classes you must attend, or can still miss, to stay at 75%.
- **Smart Adjust.** Record on-duty and medical-leave days, and preview your attendance if you skip specific future days. It follows the day-order timetable and skips classes that already started today.
- **Marks, timetable and academic calendar,** with today's day order and a countdown to your next class.
- Data comes from your college's CSV imports today. University sync (official API key or connector) sits behind a provider interface.

### 🏢 Placement workflow ([ADR-003](docs/adr/ADR-003-placement-workflow.md))
- **Campus job board.** Drives with CTC, stipend, eligibility (CGPA, branches), apply-by countdowns and visit details. Filters cover eligible, applied, eligible-but-not-applied, rejected and offers. Drives run on another portal (e.g. Haveloc) can be marked as applied.
- **Hiring process per drive.** Every round with its time and venue, and where you stand in each one.
- **Job tracker** with a round-by-round timeline.
- **Participation:** confirm or decline a round until 15 minutes before it starts, and check in with the code shown at the venue.
- **Calendar** (week, month, agenda), **notice board** with read state, and **drive chats** for applicants and the placement cell.

### 🏫 Placement-cell workspace
- Isolated per college. Students join with a join code, faculty with an admin-issued invite code.
- Manage drives and rounds, open check-in windows, record outcomes and attendance in bulk, publish notices, and moderate chats.
- Import drives, attendance, marks and the academic calendar from CSV, with a dry run first.
- Cohort analytics, applications and placement reports, covering only that college's students.

### 💼 Recruiters
- Anonymous, skill-based discovery of students who opted in, a shortlist and a hiring pipeline.
- A student's name and contact details are revealed only after they accept that recruiter's request, and they can revoke it later.

### 💳 Plans and billing
- Student **Free / Pro**, college **Campus Licence** (seats that give students Pro), recruiter **Free / Team**.
- Razorpay checkout (UPI, cards, netbanking), verified by signature and an idempotent webhook. Plan limits are enforced server-side.

### 🔒 Trust, privacy and security
- Email verification, password reset, and sign-out everywhere when the password changes.
- Self-service data export and account deletion, with consent recorded at sign-up ([Privacy](skillgraph-web/app/privacy/page.tsx), [Terms](skillgraph-web/app/terms/page.tsx)).
- Tenant isolation checked against the database on every faculty request.
- **Rate limits** per user or token on sign-in, AI, payments, check-in codes, chat and paid job-search calls.
- **Network and data safeguards:** job links are fetched with protection against requests to internal addresses, university sessions are encrypted with AES-256-GCM, and auth tokens are stored only as hashes.
- **Monitoring and setup:** structured logs with request IDs, a health check, and a startup check that fails fast on missing configuration.

---

## 🏗 Architecture

A **modular monolith** on Vercel: one Next.js app serves pages and APIs, and scheduled work runs on Vercel Cron, so there is no Redis or separate server ([ADR-001](docs/adr/ADR-001-production-architecture.md)).

```mermaid
flowchart LR
    subgraph Clients
        S[Students]
        F[Placement cells]
        R[Recruiters]
        X[Browser extension<br/>LinkedIn · Naukri · Glassdoor · Superset]
    end

    subgraph Vercel["Vercel — Next.js 16"]
        P[proxy.ts<br/>auth · roles · rate limits · request IDs]
        UI[App Router pages]
        API[API routes]
        CRON[Vercel Cron<br/>/api/cron/:job]
        subgraph LIB[lib/ — domain modules]
            AI[ai<br/>validated JSON · quotas]
            OC[openclaw<br/>filters · scoring · ATS submit]
            ACA[academics<br/>providers · attendance maths]
            PL[placement<br/>rounds · notices · chat]
            BILL[billing]
            TEN[tenant]
            ST[storage]
            SCH[scheduled jobs]
        end
    end

    DB[(Postgres on Neon<br/>Prisma migrations)]
    LLM[Groq<br/>OpenAI-compatible LLM]
    FILES[Cloudinary<br/>private files · signed URLs]
    JOBS[Job sources<br/>Greenhouse · Lever · Ashby<br/>JSearch · Adzuna]
    PAY[Razorpay]
    MAIL[SendGrid]

    S & F & R --> P --> UI & API
    X -- bearer token --> API
    CRON --> SCH
    API --> LIB
    SCH --> LIB
    LIB --> DB
    AI --> LLM
    ST --> FILES
    OC --> JOBS
    BILL --> PAY
    PAY -- webhook --> API
    LIB --> MAIL
```

### How a Smart Apply application flows

```mermaid
sequenceDiagram
    autonumber
    participant St as Student
    participant Ext as Extension
    participant SG as SkillGraph
    participant LLM as LLM
    participant ATS as Employer ATS

    Note over SG: Daily cron, or "Run now"
    SG->>SG: Discover jobs and apply the student's filters
    SG->>LLM: Score fit, then tailor résumé from the uploaded one
    alt Auto-submit on and employer connected
        SG->>ATS: Submit profile and tailored résumé (employer's API key)
        SG-->>St: Applied
    else Any other job
        SG-->>St: Ready to apply
    end

    Note over St,Ext: On a LinkedIn / Naukri / Glassdoor / Superset job page
    St->>Ext: Check filters and tailor résumé
    Ext->>SG: Job details (bearer token)
    SG->>LLM: Tailor résumé
    SG-->>Ext: Verdict, PDF and profile values
    Ext->>Ext: Fill empty fields and attach PDF (never clicks Submit)
    St->>St: Review and submit on the site
    Ext->>SG: Mark as applied
```

### Design principles
- **Truthful AI.** Every model output is validated against a schema, retried once if malformed, and capped per user per day. Prompts forbid inventing experience, sources or figures.
- **Compliant by design.** Only official APIs and licensed data sources are used. No scraping or automation of job sites from our servers, and no stored third-party credentials.
- **Tenant isolation.** College membership is always read from the database, never trusted from the session.
- **Fail closed.** Cron, webhook and extension endpoints reject calls without valid secrets, signatures or tokens.
- **Resumable background work.** Each scheduled job has a deadline and picks up where it stopped on the next run.

### Repository layout
```
SkillGraph/
├── skillgraph-web/            Next.js app (deployed to Vercel)
│   ├── app/                   pages and API routes (student, faculty, recruiter, cron)
│   ├── lib/                   domain modules: ai, openclaw, academics, placement, billing, storage, scheduled …
│   ├── components/            UI
│   ├── prisma/                schema and versioned migrations
│   ├── tests/                 unit tests + Postgres integration tests
│   ├── workers/               optional long-running worker (alternative to Vercel Cron)
│   └── vercel.json            cron schedules
├── extension/                 Smart Apply browser extension (Chrome MV3)
└── docs/adr/                  architecture decision records
```

---

## 🧰 Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind CSS |
| Auth | NextAuth v5 (JWT sessions, revoked on password change) |
| Data | PostgreSQL on Neon, Prisma ORM with versioned migrations |
| AI | Groq's OpenAI-compatible API, default model `openai/gpt-oss-120b` (set with `AI_MODEL`), zod-validated outputs |
| Files | Cloudinary authenticated storage with signed download URLs |
| Payments · email | Razorpay · SendGrid |
| Jobs data | Greenhouse, Lever and Ashby public APIs; JSearch (RapidAPI); Adzuna |
| Scheduling | Vercel Cron (Hobby: once a day per job), or the optional Bull + Redis worker |
| Extension | Chrome Manifest V3, plain JavaScript |
| Quality | Node test runner, Postgres integration tests, ESLint, TypeScript, GitHub Actions CI |

---

## 🔨 Run locally

**1. Configure.** Copy `skillgraph-web/.env.example` to `skillgraph-web/.env.local` and fill in the values (database, auth secret, LLM key, Cloudinary). The app stops at startup if a required variable is missing.

**2. Database.** Apply the versioned migrations:
```bash
cd skillgraph-web
npm run db:migrate:deploy
```
Make schema changes with `npm run db:migrate:dev -- --name <change>`; don't use `prisma db push` against shared databases.

**3. Start.**
```bash
npm run dev
```
Open `http://localhost:3000`.

**4. Browser extension (optional).** In `chrome://extensions`, turn on Developer mode, then **Load unpacked** → `extension/`. Connect it from **Smart Apply → Browser extension**. See [`extension/README.md`](extension/README.md).

### ⏰ Scheduled jobs
In production these run on **Vercel Cron** (`skillgraph-web/vercel.json` → `GET /api/cron/<job>`, authenticated with `CRON_SECRET`). Times are IST; on the Hobby plan each job starts within its scheduled hour.

| Job | When | What it does |
|-----|------|--------------|
| `market` | daily 01:30 | Loads this week's job postings and their skills, a few roles per run until all are done |
| `billing` | daily 06:00 | Expires lapsed plans, removes abandoned checkouts, sends renewal reminders |
| `openclaw` | daily 06:30 | Smart Apply run for students who switched it on |
| `sprints` | daily 07:00 | Creates a sprint for students with new high-urgency gaps |
| `openclaw-dedupe` | daily 08:30 | Marks duplicate Smart Apply applications |
| `reports` | 1st of month 08:00 | Monthly readiness emails (needs SendGrid) |

Each run stops starting new work after 4½ minutes, and the next run continues. To run one by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/<job>`. Alternatively, host the same jobs as a long-running worker (`npm run worker` or `Dockerfile.worker`, needs `REDIS_URL`). Use one or the other, never both.

### ✅ Tests and checks
```bash
npm test                                   # unit tests (Node test runner)
TEST_DATABASE_URL=postgresql://… npm run test:integration   # needs a disposable Postgres
npm run loadtest -- --base http://localhost:3000 --paths /,/api/stats --concurrency 20 --duration 15 --max-p95 1000
```
CI runs the typecheck, lint, unit tests and Postgres integration tests on every push and pull request. `GET /api/health` returns `200` when the app and database are reachable (`503` otherwise); point your uptime monitor at it.

---

## 🧭 Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **0 — Launch blockers** | Private résumé storage, fail-closed cron auth, security headers, rate limiting, validation, health check, CI | ✅ Done (git history purge pending) |
| **1 — Data & storage** | Prisma migrations, indexes and constraints, private object storage, validated AI layer with quotas | ✅ Done |
| **2 — Auto-apply compliance** | Remove the stealth automation and stored third-party cookies; official job sources only | ✅ Done |
| **3 — Trust & operations** | Email verification, password reset, consent-based recruiter reveal, data rights, observability, tests | ✅ Done |
| **4 — Commercial** | Razorpay billing and plan limits, college workspaces with tenant isolation, caching, load testing | ✅ Done (live Razorpay keys pending) |
| **5 — Academics & drives** | Attendance, Smart Adjust, marks, timetable, campus drives, CSV imports, university sync providers | 🟡 SRM API key and Academia connector pending |
| **6 — Placement workflow** | Hiring rounds, tracker, confirmation and check-in, calendar, notices, drive chats | ✅ Done |
| **7 — Smart Apply** | Filters, per-job résumés, partner ATS submission, browser extension | 🟡 Partner ATS keys, signed-in LinkedIn and Superset checks, Chrome Web Store listing pending |
| **8 — Scheduling** | Vercel Cron replaces the Redis worker | ✅ Done |

---

## 📚 Decision records

| ADR | Decision |
|-----|----------|
| [ADR-001](docs/adr/ADR-001-production-architecture.md) | Production architecture and launch-readiness plan: modular monolith, compliant auto-apply |
| [ADR-002](docs/adr/ADR-002-academics-and-placement-drives.md) | Academics and placement drives: provider interface, CSV imports, attendance maths |
| [ADR-003](docs/adr/ADR-003-placement-workflow.md) | Placement workflow: rounds, participation, calendar, notices, drive chat |
| [ADR-004](docs/adr/ADR-004-openclaw-auto-apply.md) | Smart Apply (formerly OpenClaw): filters, tailored résumés, partner ATS submission, browser extension |

---

## 🖼 Gallery

<sub>Screenshots use fictional demo data.</sub>

### Student

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dashboard.webp" alt="Student dashboard"/><br/><b>Dashboard</b> — skills, open gaps, this week's sprint, and a Today row with attendance, next class, next round and unread notices</td>
    <td width="50%"><img src="docs/screenshots/skillgap.webp" alt="Market intelligence"/><br/><b>Market intelligence</b> — skill demand from this week's postings and the real change from last week</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/sprint.webp" alt="7-day sprint"/><br/><b>7-day sprint</b> — a resource, task and checkpoint for each day, with progress saved per day</td>
    <td><img src="docs/screenshots/resume.webp" alt="Résumé builder"/><br/><b>Résumé builder</b> — drafts tailored to a job description, AI Enhance per section, ATS score and PDF export</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/benchmark.webp" alt="Benchmark"/><br/><b>Benchmark</b> — your readiness against students targeting the same role</td>
    <td><img src="docs/screenshots/academics.webp" alt="Academics"/><br/><b>Academics</b> — attendance per course, with how many classes to attend or how many you can still miss</td>
  </tr>
</table>

### Smart Apply

<table>
  <tr>
    <td width="100%"><img src="docs/screenshots/smart-apply.webp" alt="Smart Apply"/><br/><b>Smart Apply</b> — filters, opt-in auto-submit and the pipeline: graded matches, tailored résumés, and how each application was submitted (for you, via the extension, or by you)</td>
  </tr>
</table>

### Placement workflow

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/jobs.webp" alt="Campus job board"/><br/><b>Campus job board</b> — eligibility, CTC and stipend, apply-by countdowns, and "Mark applied" for other portals</td>
    <td width="50%"><img src="docs/screenshots/jobdetail.webp" alt="Job details"/><br/><b>Job details</b> — the hiring process, with where you stand in each round</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/tracker.webp" alt="Job tracker"/><br/><b>Job tracker</b> — every application, round by round</td>
    <td><img src="docs/screenshots/participation.webp" alt="Participation"/><br/><b>Participation</b> — confirm or decline rounds, and check in with the venue code</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/calendar.webp" alt="Placement calendar"/><br/><b>Calendar</b> — rounds by week, month or agenda</td>
    <td><img src="docs/screenshots/notices.webp" alt="Notice board"/><br/><b>Notices</b> — placement-cell announcements with read state</td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/chat.webp" alt="Drive chats"/><br/><b>Drive chats</b> — one group chat per drive for applicants and the placement cell</td>
  </tr>
</table>

### Placement cell

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/faculty-dashboard.webp" alt="Placement cell dashboard"/><br/><b>Placement cell dashboard</b> — students, readiness, active jobs and placements</td>
    <td width="50%"><img src="docs/screenshots/faculty-jobs.webp" alt="Job postings"/><br/><b>Job postings</b> — drives, CSV import from other placement portals, and applications</td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/faculty-analytics.webp" alt="Cohort analytics"/><br/><b>Cohort analytics</b> — the college's readiness and skill gaps</td>
  </tr>
</table>

---

<div align="center">

Built by [ftaakash](https://github.com/ftaakash)

</div>
