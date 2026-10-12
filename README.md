# SkillGraph: Autonomous Career Orchestration Platform

<p align="center">
  <img src="skillgraph-web/public/screenshots/landing.png" width="800" alt="SkillGraph Landing Page" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); shadow: 0 20px 40px rgba(0,0,0,0.4)"/>
</p>

## Project Status ⚡
![Deployment](https://img.shields.io/badge/Status-Pre--Launch%20Hardening-FFB020?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20|%20Prisma%20|%20Playwright-000000?style=for-the-badge)
![Auth](https://img.shields.io/badge/Auth-NextAuth%20v5-blue?style=for-the-badge)

SkillGraph is an end-to-end AI career mentor and autonomous application agent. It transforms the job search from a manual grind into a persistent, authenticated technical mission through robotic process automation and high-fidelity project-based learning.

---

## 🚀 Production-Grade Features (v2.5)

### 1. Multi-Platform CareerOps (OpenClaw)
The platform now supports **Authenticated Autonomous Applications**. 
- **Platform-Aware Auth**: Link separate persistent sessions for **LinkedIn, Glassdoor, Indeed, and Naukri**.
- **Real-Time Status Synchronization**: A dedicated `Syncer` service tracks application status changes live.
- **JD Skill Extraction**: 120+ keyword-based job description parser dictates matching criteria.

### 2. Resume-First High-Fidelity Engine
- **Authenticity by Design**: The agent loads your real uploaded resume and uses AI *only* to tailor the 2-3 sentence "About Me" summary for that specific job posting—fabricating zero experience.
- **Professional ATS Aesthetic**: Symmetrical PDF exports rendered flawlessly for both manual builds and OpenClaw submissions.

### 3. Faculty & Recruiter Operating Systems
- **Placement Cell OS**: Equips university faculty with cohort-level skill heatmaps, institutional matching benchmarks, and restricted campus job boards.
- **Recruiter Talent Discovery**: Anonymised skill-based routing engine matching employers instantly to verified engineering talent.

### 4. Topic-Aware Dynamic Sprints
- **Mission Overrides**: Pivot focus to specific topics (e.g., "System Design") on the fly.
- **Learning Resilience**: Integrated YouTube fallbacks ensure resources are always available.

### 5. Production Environment Guardrails
- **Environment Gateway**: Startup fast-fail validation prevents obscure deployment crashes.
- **Dynamic Database Ties**: Elements like `collegeTier` extract real schema relations rather than static fallbacks.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Automation**: Playwright (Authenticated State)
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
| **1 — Data & storage** | Prisma migrations, indexes & constraints, private object storage with signed URLs, schema-validated AI layer with quotas | ✅ Code done — [migration rollout](docs/adr/ADR-001-production-architecture.md#phase-1--data--storage-week-12) pending |
| **2 — OpenClaw compliance** | Remove stealth plugin & stored third-party cookies, official job sources, assisted apply, containerised workers | ⏳ Planned |
| **3 — Trust & operations** | Email verification, password reset, mutual-consent recruiter reveal, DPDP/GDPR data rights, Sentry, tests | ⏳ Planned |
| **4 — Commercial** | Billing & plan limits, multi-tenant college workspaces, load testing | ⏳ Planned |

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
```bash
npx ts-node workers/index.ts
```

### 5. Health Check
`GET /api/health` returns `200` when the app and database are reachable (`503` otherwise) — point your uptime monitor here.

---
<p align="center">
  Created with ♥ by ftaakash — SkillGraph v2.5 Stable
</p>
