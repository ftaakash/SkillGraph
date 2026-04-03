# SkillGraph — Code-Based Build Walkthrough

## Build Status ✅

```
✓ Compiled successfully (TypeScript)
✓ All 14 API routes registered
✓ 8 frontend pages built
✓ Proxy middleware active
✓ Production build: PASSING
```

---

## Latest Updates (v2)

* **Multi-Role Platform Expansion**: Implemented immersive portals for Faculty (Placement Cell OS) and Recruiters, complete with dedicated API endpoints for recruiter job posting.
* **OpenClaw AI & Resume Builder**: Integrated OpenClaw AI for comprehensive resume parsing, automated sprint generation, and a fully-featured Resume Builder module.
* **Hyper-Localized AI Advisor**: Refined the Indian Market AI Advisor's system prompt to provide tailored, actionable career guidance and highly accurate market intelligence.
* **Backend Robustness & Auth**: Resolved critical backend authorization bugs, strictly enforcing role-based college/company linkages in registration routing, and patched skill market data indexing.
* **UI/UX Modernization**: Achieved a comprehensive visual modernization of the Next.js App Router portal with seamless identity management and profile settings, maintaining a rigorous "deep dark" industrial theme.

---

## What Was Built

**Location:** `skillgraph-web/`

### Tech Stack 

| Next.js 14 (App Router + TypeScript) |

| PostgreSQL + Prisma 5 ORM |

| NextAuth.js v5 (JWT sessions) |

| node-cron + background workers |

| `unpdf` (canvas-free PDF extractor) |

| Cloudinary via upload_stream |

---

## ✨ Platform Features & UI/UX Experience

SkillGraph is built on a highly polished "deep dark" industrial AI aesthetic (`#0A0D14` canvas, `#141824` components), ensuring an immersive, professional environment across all portals. The sophisticated frontend utilizes vanilla Tailwind micro-interactions including smooth gradient meshes, tooltip transitions, and SVG glow filters.

### 🚀 Core Modules & Capabilities

**1. Multi-Role Portals**
- **Student Dashboard**: Real-time tracking of skills, benchmark percentiles, and 7-day AI-driven career sprints.
- **Faculty Placement Cell OS**: Deep analytics dashboard giving academic administrators visibility into student progress and institutional placement success formats.
- **Recruiter Portal**: Seamless API-driven pipeline for specialized job posting and applicant feed exploration.

**2. OpenClaw AI & Resume Builder**
- **Application Feed**: Intelligent parsing that instantly matches a recruiter's specific demands with verified candidate skills.
- **Resume Builder & Parsing Engine**: Canvas-free edge processing using `unpdf` to extract experience details accurately.

**3. Hyper-Localized AI Advisor**
- **Indian Market Intelligence**: Powered by specialized system prompts mathematically structured for tier 1/2/3 Indian corporate hiring algorithms.
- **Project Architect**: Generates customized, demonstrable project roadmaps aimed at neutralizing critical skill gaps.
- **LinkedIn Optimizer**: Side-by-side actionable tweaks leveraging OpenAI to immediately boost a candidate's public market visibility.

**4. Skill Market & Benchmarking Index**
- Real-time data visualization of the most sought-after tech stack components across the global industry.
- Integrated Bell-curve statistical engine determining percentile ranks for competitive benchmarking.

---

## 📂 File Structure

```text
skillgraph-web/
├── app/
│   ├── (app)/
│   │   ├── dashboard/page.tsx           ← Student analytics dashboard
│   │   ├── openclaw/page.tsx            ← AI Resume screening interface
│   │   └── resume-builder/page.tsx      ← ATS-friendly resume creator
│   ├── (faculty)/
│   │   └── faculty/dashboard/page.tsx   ← Placement Cell OS
│   ├── (recruiter)/
│   │   └── recruiter/dashboard/page.tsx ← Recruiter Applicant Feed
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  ← NextAuth v5 session controller
│   │   ├── openclaw/trigger/route.ts    ← OpenClaw AI logic
│   │   └── resume-builder/score/route.ts← Native evaluation handlers
│   ├── login/page.tsx                   ← Dynamic semantic portal login
│   ├── register/                        ← Multi-role registration forms
│   └── onboard/page.tsx                 ← 4-step AI Curriculum Ingestion
├── components/
│   ├── ui/                              ← radix-ui & tailwind semantic UI
│   ├── AppSidebar.tsx                   ← Main functional unified portal
│   └── NetworkBackground.tsx            ← Framer Motion aesthetic backdrop
├── lib/
│   ├── openclaw/agent.ts                ← Intelligent Core Recruiter logic
│   └── prisma.ts                        ← Singleton ORM database client
├── prisma/schema.prisma                 ← Prisma PostgreSQL schema definitions
├── workers/index.ts                     ← Background processors (Redis/Bull)
└── package.json                         ← Core dependencies (Next.js 16)
```

---

## 🚀 How to Run locally

### 1. Configure the Environment
Clone the repository and inject your configurations inside `skillgraph-web/.env.local`.

### 2. Synchronize the Database Platform
Initialize PostgreSQL variables and align the Prisma schema definitions locally:
```bash
cd skillgraph-web
npx prisma db push
```

### 3. Initiate the Dev Server
```bash
cd skillgraph-web
npm run dev
```
Navigate to `http://localhost:3000` 

### 4. Background Data Sync (Workers)
```bash
cd skillgraph-web
npx ts-node workers/index.ts
```
