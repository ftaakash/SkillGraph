# ADR-001: Production Architecture & Launch-Readiness Plan

**Status:** Proposed (Phase 0 in progress)
**Date:** 2026-10-12
**Deciders:** Aakash (product owner / lead engineer)

---

## Context

SkillGraph is a three-sided career platform (Students, Faculty/Placement Cells, Recruiters) built as a single
Next.js 16 App Router application (`skillgraph-web/`) with Prisma + PostgreSQL, NextAuth v5 (credentials/JWT),
an OpenAI-compatible LLM client (Groq Llama 3.3 by default), Cloudinary for files, Bull/Redis background
workers, and a Playwright-based autonomous job-application agent ("OpenClaw").

It works well as a demo and research prototype. It is **not yet safe to sell**. An audit of the current
`main` (commit `faa2a3e`) found the following, grouped by severity.

### Current architecture (as-is)

```
 Browser ──► Vercel (Next.js 16)
              ├─ proxy.ts            route guard (role-based redirects)
              ├─ app/(app|faculty|recruiter)   UI per role
              ├─ app/api/**  (52 route handlers)  ── Prisma ──► PostgreSQL
              │     ├─ lib/openai.ts  ──► Groq / OpenAI
              │     ├─ Cloudinary (resume PDFs)
              │     └─ lib/openclaw/*  Playwright + stealth  ──► LinkedIn / Naukri / Indeed / Glassdoor
              └─ writes to public/resumes, public/proofs   (local disk)
 workers/index.ts (Bull + Redis, run manually) ── scraper, sprint generator, monthly reports, SendGrid
```

### Findings

**Critical (launch blockers)**

| # | Finding | Where |
|---|---------|-------|
| C1 | Real user résumé PDFs and application screenshots are **committed to git** and served publicly from `/resumes/*` and `/proofs/*` with no auth. This is a personal-data leak. | `public/resumes/`, `public/proofs/`, `lib/openclaw/agent.ts:219`, `lib/openclaw/applicator.ts:63` |
| C2 | Cron endpoint auth fails **open**: if `CRON_SECRET` is unset, `undefined !== undefined` is false and anyone can trigger it. | `app/api/openclaw/integrity/route.ts` |
| C3 | OpenClaw automates logins/applications on LinkedIn, Naukri, etc. using `puppeteer-extra-plugin-stealth` and stores the users' **third-party session cookies in plaintext** (`OpenClawConfig.sessionData`). This breaches those sites' Terms of Service, risks bans of *our users'* accounts, and is a high-value secret store. | `lib/openclaw/*`, `prisma/schema.prisma` |
| C4 | Local-disk writes (`public/…`) do not persist on Vercel's serverless runtime; Playwright cannot run there at all. The agent works only on a dev machine. | same as C1 |

**High**

| # | Finding |
|---|---------|
| H1 | No rate limiting on registration, login, or LLM-backed endpoints → credential stuffing and unbounded AI cost. |
| H2 | No tests, no CI. Schema changes applied with `prisma db push` (no migration history) — unsafe for a live database. |
| H3 | LLM output is `JSON.parse`d without schema validation; a malformed response 500s the request after side effects (e.g., `resume/upload` deletes sprints/gaps *before* parsing). |
| H4 | Recruiter reveal returns candidate name/email on shortlist without an explicit student acceptance step (code comment acknowledges this). |
| H5 | Inconsistent input validation (zod on student register, none on faculty/recruiter register; password min length 6). |
| H6 | Demo-data seed endpoint is callable by any logged-in user in production. |
| H7 | No security headers (CSP, HSTS, frame-ancestors, etc.); `X-Powered-By` exposed. |

**Medium**

- No foreign-key indexes on hot `userId` columns; no `@@unique` on `RecruiterTalentView(recruiterId, studentId)` (code works around it with find-then-write races).
- Status fields are free-form strings instead of enums.
- No observability: `console.error` only, no error tracking, no health check, no request IDs.
- No email verification, password reset, account deletion or data export — required for India's DPDP Act 2023 and for GDPR if selling abroad.
- Repo root mixes product code with research artifacts (papers, 70 KB `.tsx` dumps, `.docx` files).
- Workers are a separate process with no deployment target defined.

## Decision

Keep a **modular monolith** for the web tier, split the **long-running/browser work into a separate worker
service**, and make OpenClaw **compliant-by-design** before any public launch. Deliver in four phases.

### Target architecture (to-be)

```
 Browser ──► CDN / Vercel (Next.js, stateless)
              ├─ proxy.ts  auth + RBAC + rate limit + request-id
              ├─ app/api/**  thin handlers ──► lib/services/* (domain logic, zod-validated I/O)
              │                                  ├─ lib/ai/*   provider abstraction, schema-validated outputs, timeouts, per-user quotas
              │                                  ├─ lib/storage/*  private bucket (R2/S3/Cloudinary authenticated) + signed URLs
              │                                  └─ Prisma ──► Managed Postgres (Neon/Supabase) w/ migrations + PITR backups
              └─ enqueue jobs ──► Redis (Upstash)  ◄── rate-limit store as well
 Worker service (Railway/Fly/Render container)
              ├─ job ingestion from compliant sources (JSearch, Adzuna, Greenhouse/Lever/Ashby public boards)
              ├─ sprint generation, reports, notifications (SendGrid)
              └─ "Assisted Apply": prepares tailored résumé + answers; user submits
 Observability: Sentry (errors), structured JSON logs, /api/health, uptime monitor
```

## Options Considered

### Option A: Harden the monolith in place, keep OpenClaw as-is
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Lowest |
| Scalability | Poor — Playwright can't run on Vercel |
| Team familiarity | High |

**Pros:** fastest. **Cons:** keeps ToS/legal exposure (C3) and the stored-cookie liability; agent still can't run in production.

### Option B: Modular monolith + separate worker + compliant OpenClaw (**chosen**)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Cost | +1 small container (~$5–20/mo) + Upstash free tier |
| Scalability | Good — web scales horizontally, workers scale independently |
| Team familiarity | High — same TypeScript/Prisma codebase, shared `lib/` |

**Pros:** removes legal/security blockers, runs in production, minimal rewrite.
**Cons:** "fully autonomous apply" becomes "assisted apply" on platforms without an official API.

### Option C: Microservices (separate auth, AI, matching, agent services)
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | High (infra + ops) |
| Scalability | Excellent, but not needed at launch scale |
| Team familiarity | Low for a small team |

**Pros:** independent scaling/deploys. **Cons:** premature; slows the team down more than it helps before product–market fit.

## Trade-off Analysis

The binding constraints are **shipping soon with a small team** and **not exposing users to data leaks or
account bans**. Option A fails the second constraint; Option C fails the first. Option B keeps one codebase
and one language while isolating the only workload (browser automation, long jobs) that genuinely needs a
different runtime. The product cost — losing headless auto-submit on LinkedIn/Naukri — is real, but those
flows are fragile (DOM changes, CAPTCHAs) and a liability; "assisted apply" plus official ATS board APIs is
both more reliable and defensible to colleges and recruiters who are the paying customers.

## Consequences

- **Easier:** passing a security review with colleges/recruiters; deploying to Vercel without local-disk hacks; reasoning about cost (AI quotas); safe schema evolution.
- **Harder:** OpenClaw marketing copy must change from "autonomous" to "assisted"; one more service to deploy.
- **Revisit:** multi-tenant isolation per college once >20 institutions; move to a dedicated search index (Typesense/pg_trgm) for talent search at >50k students; SSO (Google Workspace / Microsoft) for colleges.

## Implementation Plan

### Phase 0 — Launch blockers (this change set)
1. [x] Stop tracking user résumés/screenshots; gitignore `public/resumes`, `public/proofs` (C1). *Purging them from git history requires a force-push — pending owner approval.*
2. [x] Cron endpoints fail closed when `CRON_SECRET` is missing (C2).
3. [x] Security headers + disable `X-Powered-By` (H7).
4. [x] Rate limiting on auth/registration and LLM endpoints with a pluggable store (H1).
5. [x] Consistent zod validation + 8-char password minimum on all register routes (H5).
6. [x] Disable demo seed endpoint in production unless explicitly enabled (H6).
7. [x] `/api/health` liveness/readiness endpoint.
8. [x] `.env.example` documenting every variable.
9. [x] CI (GitHub Actions): install, Prisma generate, typecheck, lint (lint non-blocking until existing debt is cleared).

### Phase 1 — Data & storage (week 1–2)
1. [ ] Baseline Prisma migrations (`prisma migrate diff` from current DB) and switch deploys to `prisma migrate deploy`.
2. [ ] Add `@@index([userId])` on user-owned tables, `@@unique([recruiterId, studentId])`, enums for status fields.
3. [ ] `lib/storage` abstraction → private bucket + short-lived signed URLs; migrate existing `/resumes/*` references (C1, C4).
4. [ ] `lib/ai` wrapper: zod-validated outputs, timeout + retry, per-user daily token quota, usage table (H3).
5. [ ] Reorder `resume/upload` so destructive writes happen inside a transaction *after* successful parsing.

### Phase 2 — OpenClaw compliance re-architecture (week 2–4)
1. [ ] Remove stealth plugin and stored third-party session cookies; delete `sessionData` column after migration (C3).
2. [ ] Job ingestion from official/public APIs (JSearch already integrated; add Adzuna, Greenhouse/Lever/Ashby boards).
3. [ ] "Assisted Apply": generate tailored résumé + answers, open the posting for the user to submit; auto-submit only where an official API allows it.
4. [ ] Deploy `workers/` as a container service with its own health check and queue dashboards.

### Phase 3 — Trust, compliance, operations (week 4–6)
1. [ ] Email verification, password reset, optional Google OAuth.
2. [ ] Mutual-consent recruiter reveal (student accepts before PII is shared) (H4).
3. [ ] DPDP/GDPR: consent records, account deletion, data export endpoint, privacy policy & ToS pages.
4. [ ] Sentry + structured logging + request IDs; uptime monitor on `/api/health`.
5. [ ] Test pyramid: Vitest for `lib/` (scorer, matcher, parsers), Playwright e2e smoke for sign-up → upload → gap → sprint; make lint blocking.
6. [ ] Move research artifacts (papers, drafts, docx) out of the product repo into `research/` or a separate repository.

### Phase 4 — Commercial readiness
1. [ ] Billing (Razorpay for India / Stripe) with plan limits enforced via the AI quota system.
2. [ ] Multi-tenant college workspaces with per-college admins and data isolation tests.
3. [ ] Load test key endpoints; add caching for market analytics.
