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

**Verification Recording:**
![Live Registration and Login Verification](./assets/flawless_recording_v3_1775244149539.webp)

````carousel
![Landing Page Redesign](./assets/landing_page_1774545612770.png)
<!-- slide -->
![Sleek Authentication Flow](./assets/login_page_1774545629820.png)
<!-- slide -->
![AI Project Architect Module](./assets/project_ideas_page_1774545714085.png)
<!-- slide -->
![Identity Management / Profile Settings](./assets/profile_settings_panel_1774546600483.png)
````

---

## File Structure

```
skillgraph-web/
├── app/
│   ├── page.tsx                         ← Landing (/) with live counters + chart
│   ├── login/page.tsx                   ← Login with NextAuth signIn
│   ├── register/page.tsx                ← Register + auto-login
│   ├── onboard/page.tsx                 ← 4-step PDF upload + AI processing
│   ├── dashboard/page.tsx               ← 3-col: skills / gaps / sprint
│   ├── sprint/page.tsx                  ← 7-day checklist + confetti
│   ├── benchmark/page.tsx               ← Bell curve + percentile stats
│   ├── linkedin/page.tsx                ← AI profile optimizer (before/after)
│   ├── market/page.tsx                  ← Public skill demand index
│   ├── profile/page.tsx                 ← Edit info + re-upload resume
│   └── api/
│       ├── auth/register/route.ts       ← POST /api/auth/register
│       ├── auth/[...nextauth]/route.ts  ← NextAuth catch-all
│       ├── resume/upload/route.ts       ← POST /api/resume/upload
│       ├── gaps/route.ts               ← POST (analyze) + GET (list)
│       ├── gaps/[id]/route.ts          ← PATCH (close gap)
│       ├── sprints/route.ts            ← POST (generate) + GET (active)
│       ├── sprints/[id]/route.ts       ← PATCH (update progress)
│       ├── skills/route.ts             ← GET (user's skills)
│       ├── market/skills/route.ts      ← GET (this week's top skills)
│       ├── ai/projects/route.ts        ← POST (project suggestions)
│       ├── ai/linkedin/route.ts        ← POST (LinkedIn optimizer)
│       ├── benchmarks/route.ts         ← GET + POST
│       ├── stats/route.ts             ← GET (public impact counters)
│       └── users/me/route.ts           ← GET + PATCH (profile)
├── lib/
│   ├── prisma.ts                        ← Singleton Prisma client
│   ├── openai.ts                        ← callGPT() + all 6 prompts
│   └── api.ts                           ← getUserId(), response helpers
├── auth.ts                              ← NextAuth v5 config + handlers
├── proxy.ts                             ← Route protection (Next.js 16)
├── prisma/schema.prisma                 ← 6 DB models
├── workers/
│   ├── index.ts                         ← Sprint generator + monthly report cron
│   └── jobScraper.ts                    ← Weekly LinkedIn job scraper
└── .env.local                           ← API keys template (fill in)
```

---

## How to Run

### 1. Fill in `.env.local`
Open `skillgraph-web/.env.local` and fill in all 8 API keys.

### 2. Push the database schema
```bash
cd skillgraph-web
npx prisma db push
```

### 3. Start the dev server
```bash
cd skillgraph-web
npm run dev
```
Visit `http://localhost:3000`

### 4. Start the background workers (separate terminal)
```bash
cd skillgraph-web
npx ts-node workers/index.ts
```
