# ADR-003: Placement Workflow — Rounds, Participation, Calendar, Notices, Drive Chat (Phase 6)

**Status:** Accepted, in review
**Date:** 2026-10-13
**Deciders:** Product owner (Aakash), engineering

## Context

Students at SRM run their placement season on Haveloc. From screenshots of the student side of Haveloc
(shared by the product owner from his own account), the features students rely on are:

| Haveloc screen | What it does |
|----------------|--------------|
| Jobs | Table of drives with salary, stipend, apply-by, date of visit and status; tabs for eligible, applied, eligible-but-not-applied, rejected and offered; filters for job type, status and date; a "previous jobs" toggle |
| Job detail | Tags (location, tier, job type, on/off campus, batch), applicant count, CTC, stipend, apply-by, date of visit, and the **hiring process** — each round with the student's status |
| Tracker | Every application with a round-by-round timeline (attended, cleared, rejected, offer) |
| Chat | A group chat per drive for its applicants and the placement cell |
| Requests (Participation) | Confirm or decline each round until 15 minutes before it starts; check in to active rounds (QR, manual or RFID) |
| Calendar | Week / month / agenda view of rounds |
| Notice | Placement-cell announcements with categories, author and read state |

SkillGraph (after ADR-002) already had drives, applications, application statuses and per-user notifications,
but no notion of **rounds**, which most of these screens depend on.

We rebuild the behaviour; no Haveloc code, assets or data are copied.

## Decision

Model a drive's hiring process explicitly and build the student and placement-cell screens on top of it.

### Data model (`20261017000000_phase6_placement_workflow`, additive only)

- `DriveRound` — ordered stages of a drive: kind, time, mode, venue, and an optional short-lived check-in code.
- `RoundResult` — one per application per round: confirmation (`pending` / `confirmed` / `declined`), attendance (time and method) and outcome (`pending` / `cleared` / `rejected` / `absent`).
- `Notice`, `NoticeRead` — a college's notice board with categories, optional link to a drive, and per-user read state.
- `DriveMessage` — the drive group chat (soft-deleted so reply threads stay intact).
- `FacultyJobPosting` gains `category` (the college's own tier, e.g. Dream) and `batchYear`.

### Rules (`lib/placement/rounds.ts`)

- A student is in a round until eliminated: their application is `Rejected`, or an earlier round marked them `rejected` or `absent`. The first undecided round is *current*; later ones are *upcoming*; rounds after an elimination are *not reached*.
- Confirm / decline closes 15 minutes before a round starts.
- Check-in: faculty open a window (5–180 minutes) and the server generates a 6-character code to show at the venue; students in the round enter it. Codes are compared in constant time, attempts are rate-limited, and **the code never appears in any student-facing response**. This stands in for Haveloc's QR / RFID; a QR rendering of the same code can be added without changing the model.
- Access: a drive's chat, rounds and progress are visible to students who applied to it at their own college and to that college's faculty; everyone else gets 404. College membership is read from the database, never the session.

### Screens

Students: job board tabs, sort and filters; job detail with stats, tags and the hiring process; **Job Tracker**;
**Participation**; **Calendar** (week / month / agenda of rounds, visits and deadlines); **Notice board**;
**Drive chats** (polling every 8 s while the tab is visible).

Placement cell: **Manage drive** page (rounds editor, check-in codes, bulk outcomes and attendance per round,
application status, tier and batch); publish / withdraw notices (students are notified in-app); the same
calendar and chats for their college.

Notifications: applicants are notified when a round is scheduled and when a cleared / rejected outcome is
recorded; every student in the workspace is notified of a new notice.

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Explicit rounds + per-application results** (chosen) | One source for tracker, participation, calendar and the faculty view; outcomes per round are auditable | More tables; faculty must record outcomes per round |
| Extend `JobApplication.status` with more values | No new tables | Cannot represent several rounds, attendance or confirmation |
| Real-time chat over WebSockets | Instant delivery | Not supported by the Vercel serverless deployment without another service; polling is adequate for drive group chats |

## Consequences

- Students can follow a drive end to end in SkillGraph instead of switching to the placement portal.
- Placement cells record outcomes per round; when drives still run on Haveloc, they can import drives (ADR-002) and use SkillGraph for rounds and communication.
- Chat is polling-based: messages arrive within ~8 s. Revisit with a managed real-time service if usage grows.

## Not built (yet)

Surveys, company profiles for students, placement policy page, file attachments on notices, QR display of
check-in codes, RFID, per-chat unread counts, offer letters.

## Action items

1. [x] Schema and migration, round rules, access control, API routes, student and faculty screens
2. [x] Unit tests (round progression, cut-offs, check-in codes, validation, code never exposed); integration tests (drive access across colleges, eligibility after rejection, calendar visibility)
3. [ ] Apply the migration in production (direct Neon host) before merging
4. [ ] Follow-ups from "Not built"
