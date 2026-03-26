# SkillGraph — Make.com Scenarios Configuration Guide

> Sign in at [make.com](https://make.com). For each scenario below, click **Create a new scenario**.

---

## Scenario 1 — Weekly Job Scraper

**Trigger:** Schedule → Every Sunday at 00:00 IST  
**Purpose:** Scrape 1000 LinkedIn job postings → extract skills → populate Airtable

### Module-by-Module Setup

```
[1] SCHEDULE TRIGGER
    Type: Interval
    Repeat: Every 1 week
    Day: Sunday
    Time: 00:00
    Timezone: Asia/Kolkata
```

```
[2] TOOLS → SET VARIABLE
    Name: roles
    Value: ["SDE", "Data Analyst", "ML Engineer", "DevOps Engineer", 
            "Full Stack Developer", "Cloud Architect", "Backend Developer", 
            "Frontend Developer", "Data Engineer", "Product Manager",
            "Cybersecurity Analyst", "Android Developer", "iOS Developer",
            "QA Engineer", "Business Analyst", "System Administrator",
            "Database Administrator", "Network Engineer", "AI Engineer",
            "Blockchain Developer"]
```

```
[3] TOOLS → REPEATER
    Repeat: 20 times (one per role)
    Use: {{2.roles[i]}} — use iterator index i
```

```
[4] HTTP → MAKE A REQUEST (RapidAPI JSearch)
    URL: https://jsearch.p.rapidapi.com/search
    Method: GET
    Query Parameters:
      query: {{3.value}} jobs India
      num_pages: 5
      country: in
    Headers:
      X-RapidAPI-Key: {{your_rapidapi_key}}
      X-RapidAPI-Host: jsearch.p.rapidapi.com
    Parse Response: Yes
```

```
[5] TOOLS → ARRAY AGGREGATOR
    Source Module: 4 (HTTP response)
    Array: {{4.data}} (the jobs array from JSearch response)
```

```
[6] ITERATOR
    Array: {{5.array}} 
    (iterates over each job posting)
```

```
[7] HTTP → MAKE A REQUEST (OpenAI — Prompt 6: Skill Extractor)
    URL: https://api.openai.com/v1/chat/completions
    Method: POST
    Headers:
      Authorization: Bearer {{openai_api_key}}
      Content-Type: application/json
    Body (JSON):
    {
      "model": "gpt-4o-mini",
      "messages": [
        {
          "role": "system",
          "content": "Extract required skills from this job description. Return ONLY a JSON array of skill strings. No explanation. No markdown. Just the array."
        },
        {
          "role": "user", 
          "content": "{{6.job_description}}"
        }
      ],
      "max_tokens": 500,
      "temperature": 0
    }
```

```
[8] TOOLS → PARSE JSON
    JSON String: {{7.choices[0].message.content}}
    (stores as parsed array)
```

```
[9] AIRTABLE → CREATE A RECORD
    Connection: Your Airtable PAT
    Base: SkillGraph_DB
    Table: Job_Postings
    Fields:
      company:          {{6.employer_name}}
      role:             {{3.value}}
      location:         {{6.job_city}}, {{6.job_country}}
      salary_band:      {{6.job_min_salary}} - {{6.job_max_salary}} LPA
      required_skills:  {{8.json}} (stringified array)
      job_description_raw: {{6.job_description}}
      posted_date:      {{6.job_posted_at_datetime_utc}}
      source:           LinkedIn
      demand_week:      {{formatDate(now; "WW")}}
```

```
[10] FLOW CONTROL → ERROR HANDLER
    Type: Resume
    (skips failed records and continues)
```

**Total operations estimate:** ~2100/week (20 roles × 50 results × 2 API calls + overhead)

---

## Scenario 2 — Resume Processing Pipeline

**Trigger:** Airtable → Watch Records (new row in `Users`)  
**Purpose:** Process resume URL → extract skills → trigger gap analysis → send welcome email

```
[1] AIRTABLE → WATCH RECORDS
    Table: Users
    Trigger Field: created_at
    (fires when a new user row is added)
```

```
[2] HTTP → GET RESUME TEXT
    Method: GET
    URL: {{1.resume_url}}
    (downloads the PDF file)
    Note: Bubble stores resume as accessible URL
```

```
[3] HTTP → MAKE A REQUEST (OpenAI — Prompt 1: Resume Parser)
    URL: https://api.openai.com/v1/chat/completions
    Method: POST
    Body:
    {
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": "You are a precise resume parser. Extract structured data from the resume text provided. Return ONLY a valid JSON object with no markdown, no explanation, no backticks. Schema: { technical_skills: string[], soft_skills: string[], tools: string[], frameworks: string[], projects: [{name: string, tech: string[], description: string}], internships: [{company: string, role: string, duration: string, skills: string[]}], education: {degree: string, branch: string, cgpa: string} }"
        },
        {
          "role": "user",
          "content": "Parse this resume: {{2.data}}"
        }
      ],
      "max_tokens": 2000,
      "temperature": 0
    }
```

```
[4] TOOLS → PARSE JSON
    JSON String: {{3.choices[0].message.content}}
```

```
[5] ITERATOR
    Array: Combine all skills from {{4.technical_skills}}, {{4.tools}}, {{4.frameworks}}
    Use: Tools → Set Multiple Variables to build unified skill list
```

```
[6] REPEATER → for each skill in technical_skills
    AIRTABLE → CREATE RECORD in Skills_Profile
      user_id:     {{1.user_id}} (linked)
      skill_name:  {{5.value}}
      category:    technical
      proficiency: beginner (default, AI can override)
      source:      resume
      extracted_at: {{now}}
```

```
[7] (Same as [6] repeated for soft_skills, tools, frameworks)
```

```
[8] HTTP → MAKE A REQUEST (OpenAI — Prompt 2: Gap Analyzer)
    Body:
    {
      "model": "gpt-4o",  
      "messages": [
        {
          "role": "system",
          "content": "You are a senior hiring manager and career coach. Analyze the skill gap between a student's profile and their target role. Return ONLY valid JSON. Schema: { readiness_percentage: number (0-100), verdict: string (1 sentence), missing_skills: [{skill: string, urgency: 'high'|'medium'|'low', weeks_to_learn: number, why_important: string}], strengths: string[], quick_wins: string[] }"
        },
        {
          "role": "user",
          "content": "Student skills: {{4.all_skills_json}}. Target role: {{1.target_role}}. Top skills required by market: {{market_skills_for_role}}. Analyze the gap."
        }
      ],
      "max_tokens": 2000
    }
```

```
[9] TOOLS → PARSE JSON gap analysis result
```

```
[10] AIRTABLE → UPDATE RECORD in Users
    Record ID: {{1.record_id}}
    Fields:
      readiness_score: {{9.readiness_percentage}}
```

```
[11] ITERATOR → for each item in {{9.missing_skills}}
     AIRTABLE → CREATE RECORD in Skill_Gaps
       user_id:       {{1.record_id}} (linked)
       missing_skill: {{11.skill}}
       urgency:       {{11.urgency}}
       weeks_to_learn: {{11.weeks_to_learn}}
       why_important:  {{11.why_important}}
```

```
[12] SENDGRID → SEND EMAIL
    To: {{1.email}}
    From: hello@skillgraph.in
    Template ID: {{welcome_template_id}}
    Dynamic Template Data:
      name:             {{1.name}}
      readiness_score:  {{9.readiness_percentage}}
      target_role:      {{1.target_role}}
      missing_count:    {{length(9.missing_skills)}}
      dashboard_url:    https://skillgraph.bubbleapps.io/dashboard
```

---

## Scenario 3 — Sprint Generator

**Trigger:** Airtable → Watch Records (new row in `Skill_Gaps` WHERE `urgency = 'high'`)  
**Purpose:** Collect top 3 gaps → generate sprint → send notification

```
[1] AIRTABLE → WATCH RECORDS
    Table: Skill_Gaps
    Filter: {urgency} = 'high' AND {sprint_generated} = FALSE
```

```
[2] AIRTABLE → SEARCH RECORDS
    Table: Skill_Gaps
    Filter: user_id = {{1.user_id}} 
            AND urgency = high 
            AND sprint_generated = false
    Max Records: 3
    Sort: identified_at DESC
```

```
[3] HTTP → MAKE A REQUEST (OpenAI — Prompt 3: Sprint Generator)
    Body:
    {
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": "You are a learning coach. Create a 7-day focused learning sprint. Return ONLY a valid JSON array of 7 objects. Each object schema: { day: number, focus: string, topic: string, resource_type: 'video'|'article'|'practice', resource_title: string, resource_url: string, time_minutes: number, mini_task: string, checkpoint: string }"
        },
        {
          "role": "user",
          "content": "Create a sprint to learn: {{2[1].missing_skill}}, {{2[2].missing_skill}}, {{2[3].missing_skill}}. Target role: {{1.target_role}}."
        }
      ],
      "max_tokens": 3000
    }
```

```
[4] AIRTABLE → CREATE RECORD in Sprints
    user_id:             {{1.user_id}} (linked)
    week_start_date:     {{formatDate(now; "YYYY-MM-DD")}}
    day_tasks:           {{3.choices[0].message.content}}  (raw JSON string)
    completion_percentage: 0
    skills_targeted:     ["{{2[1].missing_skill}}", "{{2[2].missing_skill}}", "{{2[3].missing_skill}}"]
    status:              active
```

```
[5] AIRTABLE → UPDATE each of the 3 Skill_Gap records
    Field: sprint_generated = true
```

```
[6] SENDGRID → SEND EMAIL (Sprint Ready)
    Template: sprint_ready_template_id
    Dynamic Data:
      name: {{user.name}}
      sprint_url: https://skillgraph.bubbleapps.io/sprint
      skill_1: {{2[1].missing_skill}}
      skill_2: {{2[2].missing_skill}}
      skill_3: {{2[3].missing_skill}}
```

```
[7] TWILIO → SEND SMS (optional)
    To: {{user.phone}}
    Body: "🚀 Your SkillGraph sprint is ready! 7 days to master {{2[1].missing_skill}}. Start now: skillgraph.bubbleapps.io/sprint"
```

---

## Scenario 4 — Monthly PDF Report

**Trigger:** Schedule → 1st of every month at 08:00 IST  
**Purpose:** Generate PDF progress report for each active user → email it

```
[1] SCHEDULE TRIGGER
    Day of month: 1
    Time: 08:00
    Timezone: Asia/Kolkata
```

```
[2] AIRTABLE → SEARCH RECORDS (Users)
    Filter: last_active > {{subtractDays(now; 30)}}
    (all users active in last 30 days)
```

```
[3] ITERATOR over all active users
```

```
[4] AIRTABLE → SEARCH RECORDS (Skill_Gaps)
    Filter: user_id = {{3.user_id}} AND closed = true
    (count skills learned this month)
```

```
[5] PDF MONKEY → GENERATE DOCUMENT
    Template ID: {{monthly_report_template_id}}
    Payload:
      student_name:         {{3.name}}
      college:              {{3.college}}
      target_role:          {{3.target_role}}
      readiness_score_now:  {{3.readiness_score}}
      readiness_score_prev: {{3.readiness_score_prev}}
      skills_closed:        {{length(4.records)}}
      sprints_completed:    {{3.sprints_completed}}
      report_month:         {{formatDate(now; "MMMM YYYY")}}
```

```
[6] SENDGRID → SEND EMAIL with PDF attachment
    Attachment: {{5.download_url}}
```

---

## Scenario 5 — Benchmark Updater

**Trigger:** Airtable → Watch Records (Updated row in `Users` — `readiness_score` changed)

```
[1] AIRTABLE → WATCH RECORDS
    Table: Users
    Watch for: field changes on readiness_score
```

```
[2] AIRTABLE → CREATE RECORD in Benchmarks
    role:             {{1.target_role}}
    year:             {{1.year}}
    readiness_score:  {{1.readiness_score}}
    college_tier:     (map college name to tier using TOOLS → Set Variable lookup table)
    (NO NAME, EMAIL, OR PII)
```

> [!IMPORTANT]
> The Benchmarks table is **append-only**. Never update existing benchmark rows. Each score change creates a new anonymous data point for the bell curve.
