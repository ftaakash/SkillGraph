# SkillGraph: AI Career Orchestration Platform

<p align="center">
  <img src="skillgraph-web/public/screenshots/landing.png" width="800" alt="SkillGraph Landing Page" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); shadow: 0 20px 40px rgba(0,0,0,0.4)"/>
</p>

## Project Status ⚡
![Deployment](https://img.shields.io/badge/Status-Pre--Launch%20Hardening-FFB020?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20|%20Prisma%20|%20Bull%20Workers-000000?style=for-the-badge)
![Auth](https://img.shields.io/badge/Auth-NextAuth%20v5-blue?style=for-the-badge)

SkillGraph is an end-to-end AI career mentor and assisted job-application platform. It finds skill gaps against live market demand, builds focused learning sprints, and prepares tailored, truthful applications — while the student stays in control of every submission.

---

## 🚀 Features

### 1. OpenClaw — Auto-Apply ([ADR-004](docs/adr/ADR-004-openclaw-auto-apply.md))
OpenClaw finds jobs inside the student's filters, tailors a résumé to each, and applies where that's allowed.
- **Student filters**: target roles, cities/remote, minimum CTC, blocked companies, must-mention and skip keywords. Nothing outside them is prepared or submitted automatically.
- **Résumé tailored per job**, rebuilt from the student's own uploaded résumé (no invented experience).
- **Auto-submit (opt-in)** through the employer's own Greenhouse or Lever API for employers that have connected to SkillGraph (`ATS_PARTNER_KEYS`). If a form asks a question only the student can answer, it waits for them.
- **Browser extension** ([`extension/`](extension/README.md)) for LinkedIn, Naukri, Glassdoor and Superset: checks the job against the filters, tailors the résumé and fills the application form in the student's own browser. The student presses Submit.
- **Never** logs into, scrapes or automates job sites from our servers, and never stores students' passwords, cookies or session tokens for them (ADR-001 C3).
- **Compliant job sources**: official public ATS APIs (Greenhouse, Lever, Ashby), licensed aggregators (JSearch, optional Adzuna) and company career pages.
- **10-dimension fit evaluation** with strengths, gaps and negotiation leverage for any job link or pasted description.
- **Nightly run**: for active students the worker discovers roles, applies the filters, scores fit, and submits (partner employers, opt-in) or queues strong matches as *Ready to apply*.
- **Interview prep**: STAR story bank and salary-negotiation scripts per role.

### 2. Resume-First Engine
- **Authenticity by design**: the student's real uploaded résumé is the source of truth; AI reorders and rewords it for each posting and may not add employers, projects, numbers or skills.
- **ATS-friendly PDF export**, stored privately and downloaded through short-lived signed links.

### 3. Faculty & Recruiter Operating Systems
- **College workspaces**: each placement cell gets an isolated workspace; students join with a code, faculty with an admin-issued invite code. Cohort analytics, campus job board and placement reports cover only that college.
- **Campus Licence**: colleges buy seats that give their students Pro; recruiters can upgrade to a Team plan (Razorpay: UPI, cards, netbanking).
- **Recruiter Talent Discovery**: anonymous, skill-based discovery of opted-in students. A student's name and contact details are shared only after they accept that recruiter's request.

### 4. Privacy & Account Security
- Email verification, password reset, and sign-out everywhere on password change.
- Self-service data export and account deletion; consent recorded at sign-up ([Privacy](skillgraph-web/app/privacy/page.tsx), [Terms](skillgraph-web/app/terms/page.tsx)).
- Rate limiting, SSRF-guarded job fetching, private file storage, structured logs with request IDs.

### 5. Academics & Placement Drives
- **Attendance that tells you what to do**: per-course attendance with how many classes you must attend, or can still miss, to stay at 75%.
- **Smart Adjust**: save on-duty / medical-leave days and preview your attendance if you miss specific future days, using the day-order timetable.
- **Marks, timetable and academic calendar** with today's day order and a next-class countdown.
- **Placement drives** with CTC, stipend, apply-by countdowns, visit details, and "Mark applied" for drives run on another portal (e.g. Haveloc). Placement cells import drives, attendance, marks and the calendar from CSV; university sync is built behind a provider interface ([ADR-002](docs/adr/ADR-002-academics-and-placement-drives.md)).

### 6. Placement Workflow
- **Hiring process per drive**: rounds with times and venues; every student sees where they stand in each round.
- **Job Tracker**, **Participation** (confirm or decline rounds until 15 minutes before, check in with a code shown at the venue), **Placement Calendar** (week, month, agenda), **Notice board** and **Drive chats**.
- **Placement cell tools**: manage rounds, open check-in, record outcomes and attendance in bulk, publish notices ([ADR-003](docs/adr/ADR-003-placement-workflow.md)).

### 7. Topic-Aware Dynamic Sprints
- **Mission Overrides**: Pivot focus to specific topics (e.g., "System Design") on the fly.
- **Learning Resilience**: Integrated YouTube fallbacks ensure resources are always available.

### 8. Production Environment Guardrails
- **Environment Gateway**: Startup fast-fail validation prevents obscure deployment crashes.
- **Dynamic Database Ties**: Elements like `collegeTier` extract real schema relations rather than static fallbacks.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Background jobs**: Bull + Redis worker service (`workers/`, `Dockerfile.worker`)
- **Job sources**: Greenhouse / Lever / Ashby public APIs, JSearch, Adzuna
- **AI Orchestration**: GPT-4o / Llama 3.3

---

## 🧭 Road to Production Launch

SkillGraph is moving from a working prototype to a sellable product. The full analysis, options considered and
decision are in **[ADR-001: Production Architecture & Launch-Readiness Plan](docs/adr/ADR-001-production-architecture.md)**.

**Architecture decision:** keep a *modular monolith* for the web tier (Next.js on Vercel), move browser automation
and long-running jobs into a *separate worker service*, and make OpenClaw *compliant-by-design* (official job APIs +
"assisted apply") instead of stealth automation of third-party sites.

| Phase | Focus | Status |
|-------|-------|--------|
| **0 — Launch blockers** | Stop serving user résumés from `public/`, fail-closed cron auth, security headers, rate limiting, consistent validation, health check, `.env.example`, CI | ✅ Done (history purge pending) |
| **1 — Data & storage** | Prisma migrations, indexes & constraints, private object storage with signed URLs, schema-validated AI layer with quotas | ✅ Done |
| **2 — OpenClaw compliance** | Remove stealth plugin & stored third-party cookies, official job sources, assisted apply, containerised workers | ✅ Done |
| **3 — Trust & operations** | Email verification, password reset, mutual-consent recruiter reveal, DPDP/GDPR data rights, observability, tests | ✅ Done |
| **4 — Commercial** | Razorpay billing & plan limits, college workspaces with tenant isolation, caching, load testing | ✅ Done (Razorpay keys pending) |
| **5 — Academics & drives** ([ADR-002](docs/adr/ADR-002-academics-and-placement-drives.md)) | Attendance, Smart Adjust, marks, timetable; Haveloc-style drives; college CSV imports; university sync providers | 🟡 In review — SRM API key and Academia connector pending |
| **6 — Placement workflow** ([ADR-003](docs/adr/ADR-003-placement-workflow.md)) | Hiring rounds, job tracker, round confirmation & check-in, placement calendar, notice board, drive chats | ✅ Done |
| **7 — OpenClaw auto-apply** ([ADR-004](docs/adr/ADR-004-openclaw-auto-apply.md)) | Job filters, per-job tailored résumés, opt-in submission through partner employers' ATS APIs, browser extension for LinkedIn/Naukri/Glassdoor/Superset | 🟡 In review — partner keys and live-site checks pending |

```
 Browser ──► Next.js (Vercel, stateless) ──► lib/services ──► Postgres (migrations, backups)
                 │   auth · RBAC · rate limit        ├─► lib/ai (validated outputs, quotas)
                 │                                   └─► private object storage (signed URLs)
                 └─► Redis queue ──► Worker service (job ingestion, sprints, reports, assisted apply)
```

---

## 📂 Platform Gallery

### 🖥️ Main Interfaces
<p align="center">
  <img src="skillgraph-web/public/screenshots/dashboard.png" width="45%" alt="Dashboard"/>
  <img src="skillgraph-web/public/screenshots/agent.png" width="45%" alt="OpenClaw Agent"/>
</p>

### 🎯 Skill Development
<p align="center">
  <img src="skillgraph-web/public/screenshots/sprint.png" width="80%" alt="7-Day Sprints"/>
</p>

---

## 🔨 How to Run locally

### 1. Configure the Environment
Clone the repository, copy `skillgraph-web/.env.example` to `skillgraph-web/.env.local` and fill in the values
(database, NextAuth secret, LLM key, Cloudinary). The app fails fast at startup if a required variable is missing.

### 2. Physical Database Sync
Initialize PostgreSQL and apply the versioned migrations:
```bash
cd skillgraph-web
npm run db:migrate:deploy
```
Schema changes are made with `npm run db:migrate:dev -- --name <change>` — do not use `prisma db push` against shared databases.

### 3. Initiate the Dev Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

### 4. Background Workers
Requires `REDIS_URL`. Runs market-data refresh, sprint generation, monthly reports and the nightly OpenClaw preparation; exposes `GET /health` on `PORT` (default 8080).
```bash
npm run worker
```
In production, deploy it as its own container: `docker build -f Dockerfile.worker -t skillgraph-worker .`

### 5. Tests
```bash
npm test
```
Unit tests run on Node's built-in test runner; CI also runs the typecheck and lint on every push and pull request.

### 6. Load Test
```bash
npm run loadtest -- --base http://localhost:3000 --paths /,/api/stats --concurrency 20 --duration 15 --max-p95 1000
```
Run against a production build and a staging database. Integration tests need a disposable Postgres: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillgraph_test npm run test:integration`.

### 7. Health Check
`GET /api/health` returns `200` when the app and database are reachable (`503` otherwise) — point your uptime monitor here.

---
<p align="center">
  Created with ♥ by ftaakash — SkillGraph v2.5 Stable
</p>
