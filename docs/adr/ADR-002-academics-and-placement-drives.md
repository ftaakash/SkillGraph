# ADR-002: Academics & Placement Drives (Phase 5)

**Status:** Accepted, in progress
**Date:** 2026-10-13
**Deciders:** Product owner (Aakash), engineering

## Context

Students at SRM split their day between three university systems (SRM Academia for attendance, marks and
timetable; the SRM Student Portal; the campus WiFi login) and a placement portal (Haveloc). Two products
show what students value:

- **GradeX** (gradex.bond, SRM-only student portal). Observed in its public `/demo` and public JavaScript only;
  the source is not published (the GitHub repository is a showcase README).
  - attendance per course with *required* / *can miss* counts against the 75% rule
  - *Smart Adjust*: on-duty / medical-leave dates and a "what if I miss these days" predictor built on
    day orders (D1–D5)
  - marks per assessment with credits, a day-order timetable, an academic calendar, a next-class countdown
  - a Haveloc placement feed (CTC, stipend, apply-by countdown, visit date and mode, "Mark applied")
  - data comes from signing in to SRM Academia with the student's own password from GradeX's server
- **Haveloc** (placements.haveloc.com): the college placement portal. The login page is behind a reCAPTCHA
  and has no public API.

SkillGraph already has campus job postings, applications and college workspaces (ADR-001 Phase 4). Adding
the day-to-day academic features gives students a reason to open SkillGraph daily, and gives placement cells
attendance risk alongside placement readiness.

We rebuild the *behaviour* we observed; no GradeX or Haveloc code or assets are copied.

## Decision

Build an **academics module** behind a provider interface, and extend **campus drives** to carry what
placement portals publish.

### Data sources (in order of preference)

| Source | How | Status |
|--------|-----|--------|
| `srm_api` — official university API | Server-to-server with an API key issued to SkillGraph. Students are identified by their **verified** `@srmist.edu.in` SkillGraph email (re-checked on every sync), never by a register number they type. | Built against a proposed contract (`lib/academics/providers.ts`); adapt `fetch` once SRM publishes its API. Off until `SRM_API_BASE_URL` / `SRM_API_KEY` are set. |
| `srm_academia` — portal sign-in | Student enters their Academia login. The password is used once to open a portal session and is **never stored or logged**; only the session is kept, encrypted with AES-256-GCM and bound to the user id. Expired sessions are dropped and the student is asked to sign in again. CAPTCHAs are never solved; the student is told to sign in on the portal first. | Framework, consent, encryption, lifecycle and UI built. **The portal-specific transport (sign-in steps and page parsers) is deliberately a stub**: it must be written and verified against a real student account with the university's permission. Off until implemented and `SRM_ACADEMIA_CONNECTOR=enabled`. |
| `college` — CSV imports | Faculty upload attendance/marks records and the academic calendar, matched to students who joined their workspace. | Built. Works today. |

Haveloc drives are imported by the placement cell as CSV (or from Haveloc's API if access is granted). We do
not automate the Haveloc login.

### Data model (`20261016000000_phase5_academics`)

- `AcademicConnection` — one per student: provider, status (`active` / `needs_reauth` / `error`), encrypted session, consent time.
- `AcademicProfile` — register number, programme, semester, plus the timetable and calendar as validated JSON.
- `AcademicCourse` — per course: attendance and marks components, tagged with its source. A sync replaces only its own source's rows.
- `AttendanceLeave` — OD / ML dates a student saves.
- `CollegeCalendarDay` — a college's day orders and holidays; the fallback when a student has no synced calendar.
- `FacultyJobPosting` gains job type, location, stipend range, duration, visit mode, source, `externalRef` (unique per college, so re-imports update in place) and `applyUrl`.
- `JobApplication.channel` — `skillgraph` or `external` (the student marked a drive applied on another portal).

### Behaviour

- Attendance arithmetic in integers (`lib/academics/calc.ts`): required = ⌈(t·c − 100·a)/(100 − t)⌉, can miss = ⌊(100·a − t·c)/t⌋. Verified against values in GradeX's demo and by an exhaustive property test.
- Projections run in the browser from the timetable and calendar: missed days add conducted classes only, OD/ML days count as attended, past OD/ML days credit back classes until the university record catches up.
- All provider output is validated (`academicDataSchema`) before it is stored.
- Faculty imports always preview (dry run) before writing, report per-line errors, and only reach their own college.
- Students can resync at most every 10 minutes, and connect/sync/import endpoints share a rate-limit bucket.
- Data export includes the new tables (never the encrypted session). Account deletion cascades. Disconnecting can also delete synced data.

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Provider interface: official API → portal sign-in → college import** (chosen) | Works today through colleges; ready for an official API; the portal connector is isolated and off by default | Portal transport still to be written and verified |
| B. Portal sign-in only, like GradeX | Fastest parity with GradeX | Holds a credential path to a third-party system; breaks whenever the portal changes; depends entirely on the university's goodwill |
| C. College imports only | No third-party credentials at all | Data only as fresh as the last upload; nothing for students whose college has not signed up |

## Consequences

- Placement cells get attendance risk next to placement data, and can run Haveloc drives through SkillGraph's job board with "Mark applied" tracking.
- Students get GradeX-style attendance, Smart Adjust, marks and timetable inside SkillGraph.
- Operating the portal connector carries obligations: written permission from the university, a security review of the transport, and incident handling if the portal changes.

## Action items

1. [x] Schema and migration, academics library, providers, college imports, API routes
2. [x] Student Academics page; upgraded Campus Jobs; faculty Academics page and drive import
3. [x] Unit tests (arithmetic, projections, encryption, providers, CSV imports); integration tests for tenant isolation and sync replacement
4. [ ] Apply the migration in production (direct Neon host, as for ADR-001) and set `ACADEMIC_ENCRYPTION_KEY` in Vercel
5. [ ] Request an API key and documentation from SRM; adapt `srmApiProvider.fetch` to the real contract
6. [ ] With SRM's permission and a consenting test account: implement and verify the Academia transport, then enable it
7. [ ] Ask Haveloc for API access; until then, placement cells use the drive CSV import
8. [ ] Follow-ups: timetable import for colleges without university sync; worker job to resync active connections nightly; attendance alerts
