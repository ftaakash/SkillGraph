# SkillGraph: Autonomous Career Orchestration Platform

<p align="center">
  <img src="skillgraph-web/public/screenshots/landing.png" width="800" alt="SkillGraph Landing Page" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); shadow: 0 20px 40px rgba(0,0,0,0.4)"/>
</p>

## Project Status ⚡
![Deployment](https://img.shields.io/badge/Status-Production--Ready-00FFCC?style=for-the-badge)
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
- **AI Orhcestration**: GPT-4o / Llama 3.3

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
Clone the repository and inject your configurations inside `skillgraph-web/.env.local` (OpenAI, Cloudinary, Database URLs).

### 2. Physical Database Sync
Initialize PostgreSQL and align the Prisma schema definitions locally:
```bash
cd skillgraph-web
npx prisma db push
```

### 3. Initiate the Dev Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

### 4. CareerOps Background Service
```bash
npx ts-node lib/openclaw/syncer.ts
```

---
<p align="center">
  Created with ♥ by ftaakash — SkillGraph v2.5 Stable
</p>
