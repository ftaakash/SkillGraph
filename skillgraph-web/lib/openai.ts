import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1'
})

export type GPTModel = string

/**
 * The model every AI feature uses. Override with AI_MODEL when the provider changes its lineup
 * (Groq retired llama-3.3-70b-versatile; requests for it now fail with 404).
 */
export const AI_MODEL: GPTModel = process.env.AI_MODEL || 'openai/gpt-oss-120b'

/**
 * Provider-specific request options. gpt-oss models reason before answering and the reasoning
 * counts against max_tokens, so short outputs get headroom and low reasoning effort (about 3x
 * fewer tokens in testing with the same answer).
 */
export function modelOptions(model: GPTModel, maxTokens: number) {
  if (model.startsWith('openai/gpt-oss')) {
    return { max_tokens: maxTokens + 1024, reasoning_effort: 'low' as const }
  }
  return { max_tokens: maxTokens }
}

export async function callGPT(
  systemPrompt: string,
  userPrompt: string,
  model: GPTModel = AI_MODEL,
  maxTokens = 2000
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...modelOptions(model, maxTokens),
    temperature: 0,
    response_format: { type: 'json_object' },
  })
  return response.choices[0].message.content ?? '{}'
}

export async function callGPTText(
  systemPrompt: string,
  userPrompt: string,
  model: GPTModel = AI_MODEL,
  maxTokens = 300
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...modelOptions(model, maxTokens),
    temperature: 0.4,
  })
  return (response.choices[0].message.content ?? '').trim()
}

export async function callGPTArray(
  systemPrompt: string,
  userPrompt: string,
  model: GPTModel = AI_MODEL,
  maxTokens = 3000
): Promise<string> {
  // For prompts that return a JSON array (not wrapped object)
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...modelOptions(model, maxTokens),
    temperature: 0.3,
  })
  return response.choices[0].message.content ?? '[]'
}

// ─── PROMPT TEMPLATES ──────────────────────────────────────────────────────────

export const PROMPTS = {
  RESUME_PARSER: `You are a precise resume parser. Extract structured data from the resume text provided. Return ONLY a valid JSON object with no markdown, no explanation, no backticks. Schema: { "technical_skills": string[], "soft_skills": string[], "tools": string[], "frameworks": string[], "projects": [{"name": string, "tech": string[], "description": string}], "internships": [{"company": string, "role": string, "duration": string, "skills": string[]}], "education": {"degree": string, "branch": string, "cgpa": string} }`,

  GAP_ANALYZER: `You are a senior hiring manager and career coach. Analyze the skill gap between a student's profile and their target role.
Rules:
- A skill the student clearly has by implication is NOT missing: React/Next.js implies HTML, CSS and JavaScript; Node.js/Express/Spring Boot implies REST APIs; PostgreSQL/MySQL implies SQL.
- The market list mixes alternative stacks. Do not list an alternative to something the student already knows as missing (Angular or Vue when they know React; C#/.NET when they know Java or Node.js; MySQL when they know PostgreSQL) unless the target role specifically requires it, and then at most "low" urgency.
- "high" urgency is only for skills most postings for this role require and the student has no equivalent of. List at most 8 missing skills, most important first.
Return ONLY valid JSON with this exact schema: { "readiness_percentage": number, "verdict": string, "missing_skills": [{"skill": string, "urgency": "high"|"medium"|"low", "weeks_to_learn": number, "why_important": string}], "strengths": string[], "quick_wins": string[] }`,

  SPRINT_GENERATOR: `You are a learning coach. Create a 7-day focused learning sprint. Return ONLY a valid JSON array of exactly 7 objects (not wrapped in an object). Each object schema: { "day": number, "focus": string, "topic": string, "resource_type": "video"|"article"|"practice", "resource_title": string, "resource_url": string, "time_minutes": number, "mini_task": string, "checkpoint": string }. CRITICAL: Ensure resource_url points to high-uptime, public, free resources (e.g., YouTube, MDN, FreeCodeCamp, official docs). Avoid Udemy/Coursera deep links or pay-walled content. If a direct link is unavailable, use a high-quality search query URL like https://www.youtube.com/results?search_query=[topic]+tutorial.`,

  PROJECT_SUGGESTER: `You are a senior software engineer mentoring a student. Suggest 5 buildable projects. Return ONLY a valid JSON array of 5 project objects (not wrapped). Schema: { "title": string, "tagline": string, "difficulty": "beginner"|"intermediate", "tech_stack": string[], "core_features": string[], "github_readme_outline": string[], "recruiter_signal": string, "time_to_build_weeks": number }`,

  LINKEDIN_OPTIMIZER: `You are a LinkedIn optimization expert and ATS specialist. Rewrite the profile for maximum recruiter visibility. Return ONLY valid JSON. Schema: { "headline": string, "about": string, "skills": string[], "keywords_added": string[], "ats_score_estimate_before": number, "ats_score_estimate_after": number, "improvement_tips": string[] }`,

  JD_SKILL_EXTRACTOR: `Extract required skills from this job description. Return ONLY a JSON array of skill strings. No explanation. No markdown. Just the array.`,

  TAILORED_SUMMARY: `You are a professional resume writer specializing in the Indian tech market.
Your task: take an existing candidate summary and a job description, then write a SINGLE tailored version of the summary.
Rules:
- Keep it to 2-3 sentences maximum
- Preserve the candidate's authentic voice and real experience
- Naturally weave in 1-2 keywords from the job description where they fit truthfully
- Do NOT add skills, projects, or experience the candidate does not have
- Do NOT use generic filler phrases like "passionate" or "results-driven"
- Output ONLY the summary text — no labels, no quotes, no JSON, no explanation`,
}
