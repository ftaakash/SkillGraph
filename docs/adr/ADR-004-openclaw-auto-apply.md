# ADR-004: OpenClaw Auto-Apply — Filters, Tailored Résumés, Partner ATS Submission, Browser Extension

**Status:** Accepted, in review
**Date:** 2026-10-13
**Deciders:** Product owner (Aakash), engineering

## Context

The product owner asked for OpenClaw to apply to jobs automatically on LinkedIn, Naukri, Glassdoor and
Superset, using each student's user id or session token for those sites, with a résumé customised to
each job and only for jobs that pass the student's own filters.

ADR-001 (finding C3) removed exactly this design in Phase 2. Logging in as the student, or replaying
their session cookies, to automate those sites:
- breaks those sites' terms, which forbid automated access and applications;
- gets **students'** accounts restricted or banned, often during placement season;
- turns SkillGraph into a store of live third-party sessions, the most valuable thing an attacker could take from us.

Two findings shaped the alternative:
1. **Public ATS "apply" APIs need the employer's key.** Greenhouse's Job Board API and Lever's Postings API
   accept applications only with an API key the employer issues. A third party can't submit to them on its own.
   So genuine auto-submit is possible only for employers who connect their hiring system to SkillGraph.
2. **The old agent tailored only the summary.** Other sections came from saved Résumé Builder versions,
   so a student who had only uploaded a PDF got a résumé with no experience or projects.

## Decision

1. **Job filters** (`lib/openclaw/filters.ts`). Target roles, cities (including remote), minimum CTC
   (parsed from the band in LPA), blocked companies, and two new filters:
   - **must mention:** the job has to mention at least one of these keywords;
   - **skip if mentioning:** the job is skipped if it mentions any of these.

   One pure function, `checkFilters`, is used by the nightly agent and by the extension. A job outside the filters is never
   prepared or submitted automatically. In the extension the student can choose "Tailor anyway".
2. **Full tailored résumé** (`lib/resume/tailor.ts`). It is built from the student's uploaded résumé and
   profile for each job, with the same no-invention rules as the Résumé Builder. It is stored privately as a
   `ResumeVersion` and shared by the Résumé Builder, the agent and the extension.
3. **Partner ATS auto-submit, opt-in** (`lib/openclaw/submit.ts`).
   - **When it runs:** only if the student turns on *Submit for me where the employer allows it* and the posting is on a Greenhouse
     board or Lever site whose employer key is in `ATS_PARTNER_KEYS`.
   - **What it sends:** OpenClaw reads the application form and answers only standard fields from the profile (name, email, phone,
     links, college), then attaches the tailored résumé.
   - **When it stops:** if any required question can't be answered from the profile (expected CTC, notice period, essays), nothing is sent and
     the application waits as `ReadyToApply` with the reason.
   - **What it records:** submitted applications are `Applied` with `submittedVia = ats_api` and the ATS's application id.
4. **Browser extension for LinkedIn, Naukri, Glassdoor and Superset** (`extension/`, Chrome MV3).
   - **Flow:** on a job page it reads the job, checks the filters through SkillGraph, gets the tailored résumé
     and fills the application form in the student's own signed-in browser.
   - **What it fills:** empty fields only, never overwriting the student's answers. It attaches the PDF and
     highlights questions only the student can answer.
   - **What it never does:** it never clicks Submit. *I submitted it* records the application as `Applied` with `submittedVia = extension`.
   - **Authentication:** a 30-day bearer token stored hashed (`AuthToken` type `extension`). It is created, shown once and revoked on the OpenClaw page.
   - **What it reads:** the extension reads nothing from job sites except the job shown, and sends nothing
     of the student's sessions or cookies anywhere.
5. **Superset** is a college-run platform. Beyond the extension, deeper integration should come through the
   placement cell's official export, like the Haveloc CSV import in ADR-002, never through student logins.

Rejected: storing students' job-site session tokens or passwords and automating applications server-side
(the request as stated), for the reasons in *Context*.

## Consequences

- Students get one-click assisted applications on the four sites and true auto-apply where employers allow it, with a résumé
  tailored to each job.
- Auto-submit stays inactive until an employer issues a key. Getting partner employers is a business task, not an engineering one.
- Job sites change their markup. The extension's readers (`extension/sites.js`) need maintenance, and students can always
  select the job text manually.
- The extension is distributed unpacked for now. Publishing to the Chrome Web Store needs a privacy policy entry (done in
  `/privacy`, pending legal review) and a store listing.
- Schema: `OpenClawConfig.includeKeywords`, `excludeKeywords` and `autoSubmit`, plus `OpenClawApplication.submittedVia` and
  `externalRef` (migration `20261018000000_openclaw_auto_apply`, additive only).

## Action items
1. [x] Filters, tailored résumé, partner ATS submitter, agent integration, settings UI.
2. [x] Extension API (`/api/extension/*`), per-token rate limiting, extension (MV3), connect/revoke UI.
3. [ ] Verify the Greenhouse and Lever submit calls against a real partner's sandbox before enabling `ATS_PARTNER_KEYS` in production.
4. [ ] Check the extension's site readers against live LinkedIn, Naukri, Glassdoor and Superset pages (they are written from public markup and need a signed-in check).
5. [ ] Chrome Web Store listing once legal has reviewed the privacy text.
