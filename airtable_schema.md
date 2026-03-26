# SkillGraph — Airtable Base Schema

> **Base Name:** `SkillGraph_DB`  
> Create this base at [airtable.com/create](https://airtable.com/create). All 6 tables below.

---

## Table 1: `Users`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `user_id` | **Autonumber** | Primary key. Auto-increments. |
| `name` | Single Line Text | Student's full name |
| `email` | Email | Used for SendGrid, must be unique |
| `college` | Single Line Text | e.g., "VJTI Mumbai" |
| `branch` | Single Select | Options: CSE, IT, ECE, EEE, Mechanical, Other |
| `year` | Single Select | Options: 1st, 2nd, 3rd, 4th |
| `target_role` | Single Select | Options: SDE, Data Analyst, ML Engineer, DevOps Engineer, Cloud Architect, Product Manager, Cybersecurity Analyst, Full Stack Dev |
| `readiness_score` | Number | 0–100, decimal precision. Updated after gap analysis. |
| `readiness_score_prev` | Number | Previous score — used to calculate delta for monthly report |
| `resume_url` | URL | Bubble file uploader stores URL here |
| `firebase_uid` | Single Line Text | Links to Firebase Auth |
| `sprints_completed` | Number | Counter. Incremented by Make.com |
| `optimizer_sessions` | Number | LinkedIn Optimizer use count |
| `created_at` | Created Time | Auto |
| `last_active` | Last Modified Time | Auto |

---

## Table 2: `Skills_Profile`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `skill_id` | Autonumber | Primary key |
| `user_id` | Link to Table → Users | Links back to the user |
| `skill_name` | Single Line Text | e.g., "React.js", "Communication" |
| `category` | Single Select | Options: technical, soft, tool, framework |
| `proficiency` | Single Select | Options: beginner, intermediate, advanced |
| `source` | Single Select | Options: resume, manual |
| `extracted_at` | Date | Date skill was extracted from resume |

> **Note:** One user → many rows here. OpenAI extracts ~20–40 skills per resume.

---

## Table 3: `Job_Postings`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `job_id` | Autonumber | Primary key |
| `company` | Single Line Text | e.g., "Google" |
| `role` | Single Select | Same options as `target_role` in Users |
| `location` | Single Line Text | e.g., "Bangalore, India" |
| `salary_band` | Single Line Text | e.g., "12–18 LPA" |
| `required_skills` | Long Text | JSON array string from OpenAI extraction |
| `job_description_raw` | Long Text | Raw JD text from RapidAPI |
| `posted_date` | Date | From API response |
| `scraped_at` | Created Time | Auto |
| `source` | Single Select | Options: LinkedIn, Naukri, Indeed |
| `demand_week` | Number | ISO week number — for "this week" filtering |

---

## Table 4: `Skill_Gaps`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `gap_id` | Autonumber | Primary key |
| `user_id` | Link to Table → Users | |
| `missing_skill` | Single Line Text | e.g., "Docker" |
| `urgency` | Single Select | Options: high, medium, low |
| `weeks_to_learn` | Number | From OpenAI response |
| `why_important` | Long Text | OpenAI explanation |
| `demand_score` | Number | 0–100. Calculated from Job_Postings frequency |
| `resource_links` | Long Text | JSON array of curated links |
| `closed` | Checkbox | Toggled when user marks skill as learned |
| `sprint_generated` | Checkbox | True after Make.com Scenario 3 runs |
| `identified_at` | Created Time | Auto |

---

## Table 5: `Sprints`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `sprint_id` | Autonumber | Primary key |
| `user_id` | Link to Table → Users | |
| `week_start_date` | Date | Monday of the current week |
| `day_tasks` | Long Text | JSON array of 7 day objects from OpenAI |
| `completion_percentage` | Number | 0–100, updated as user checks off days |
| `skills_targeted` | Long Text | JSON array of 3 skill strings |
| `status` | Single Select | Options: active, completed, abandoned |
| `generated_at` | Created Time | Auto |
| `completed_at` | Date | Set when status → completed |

---

## Table 6: `Benchmarks`

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `bench_id` | Autonumber | Primary key |
| `role` | Single Select | Same as target_role options |
| `year` | Single Select | 1st / 2nd / 3rd / 4th |
| `readiness_score` | Number | Anonymized score |
| `college_tier` | Single Select | Options: Tier-1, Tier-2, Tier-3 (anonymized) |
| `timestamp` | Created Time | Auto |

> **Privacy:** No PII stored here. Set field permissions so users can only read aggregated data, not individual rows.

---

## Table 7: `Optimizer_Sessions` *(New — for Impact Dashboard)*

| Field Name | Field Type | Notes / Options |
|---|---|---|
| `session_id` | Autonumber | |
| `user_id` | Link to Table → Users | |
| `target_role_optimized` | Single Line Text | |
| `ats_score_before` | Number | |
| `ats_score_after` | Number | |
| `created_at` | Created Time | Auto |

---

## Airtable Setup Checklist

- [ ] Create base named `SkillGraph_DB`
- [ ] Create all 7 tables with exact field names above
- [ ] Set up Linked Record between `Skills_Profile.user_id` ↔ `Users`
- [ ] Set up Linked Record between `Skill_Gaps.user_id` ↔ `Users`
- [ ] Set up Linked Record between `Sprints.user_id` ↔ `Users`
- [ ] Create a **View** in `Job_Postings` called `This_Week` filtered by `demand_week = WEEKNUM(TODAY())`
- [ ] Create a **View** in `Skill_Gaps` called `High_Priority` filtered by `urgency = 'high'` AND `closed = false`
- [ ] Generate a **Personal Access Token** (PAT) at [airtable.com/create/tokens](https://airtable.com/create/tokens) with `data.records:read`, `data.records:write`, `schema.bases:read` scopes
- [ ] Note your **Base ID** from the URL: `airtable.com/appXXXXXXXXXXXXXX/...`
