import OpenAI from 'openai'

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1'
})

export type GPTModel = 'llama-3.3-70b-versatile' | 'gpt-4o' | 'gpt-4o-mini' | 'llama-3.3-70b-versatile'

export async function callGPT(
  systemPrompt: string,
  userPrompt: string,
  model: GPTModel = 'llama-3.3-70b-versatile',
  maxTokens = 2000
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0,
    response_format: { type: 'json_object' },
  })
  return response.choices[0].message.content ?? '{}'
}

export async function callGPTArray(
  systemPrompt: string,
  userPrompt: string,
  model: GPTModel = 'llama-3.3-70b-versatile',
  maxTokens = 3000
): Promise<string> {
  // For prompts that return a JSON array (not wrapped object)
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  })
  return response.choices[0].message.content ?? '[]'
}

// ─── PROMPT TEMPLATES ──────────────────────────────────────────────────────────

export const PROMPTS = {
  RESUME_PARSER: `You are a precise resume parser. Extract structured data from the resume text provided. Return ONLY a valid JSON object with no markdown, no explanation, no backticks. Schema: { "technical_skills": string[], "soft_skills": string[], "tools": string[], "frameworks": string[], "projects": [{"name": string, "tech": string[], "description": string}], "internships": [{"company": string, "role": string, "duration": string, "skills": string[]}], "education": {"degree": string, "branch": string, "cgpa": string} }`,

  GAP_ANALYZER: `You are a senior hiring manager and career coach. Analyze the skill gap between a student's profile and their target role. Return ONLY valid JSON with this exact schema: { "readiness_percentage": number, "verdict": string, "missing_skills": [{"skill": string, "urgency": "high"|"medium"|"low", "weeks_to_learn": number, "why_important": string}], "strengths": string[], "quick_wins": string[] }`,

  SPRINT_GENERATOR: `You are a learning coach. Create a 7-day focused learning sprint. Return ONLY a valid JSON array of exactly 7 objects (not wrapped in an object). Each object schema: { "day": number, "focus": string, "topic": string, "resource_type": "video"|"article"|"practice", "resource_title": string, "resource_url": string, "time_minutes": number, "mini_task": string, "checkpoint": string }`,

  PROJECT_SUGGESTER: `You are a senior software engineer mentoring a student. Suggest 5 buildable projects. Return ONLY a valid JSON array of 5 project objects (not wrapped). Schema: { "title": string, "tagline": string, "difficulty": "beginner"|"intermediate", "tech_stack": string[], "core_features": string[], "github_readme_outline": string[], "recruiter_signal": string, "time_to_build_weeks": number }`,

  LINKEDIN_OPTIMIZER: `You are a LinkedIn optimization expert and ATS specialist. Rewrite the profile for maximum recruiter visibility. Return ONLY valid JSON. Schema: { "headline": string, "about": string, "skills": string[], "keywords_added": string[], "ats_score_estimate_before": number, "ats_score_estimate_after": number, "improvement_tips": string[] }`,

  JD_SKILL_EXTRACTOR: `Extract required skills from this job description. Return ONLY a JSON array of skill strings. No explanation. No markdown. Just the array.`,
}
