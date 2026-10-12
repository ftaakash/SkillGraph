import { generateJson } from '@/lib/ai'
import { jobMatchSchema } from '@/lib/ai/schemas'

const OPENCLAW_MATCH_PROMPT = `You are a senior technical recruiter assessing job-candidate fit for the Indian tech market.
You will receive a student's skills and a job description.
Return ONLY a valid JSON object with this schema:
{
  "matchScore": number (0-100),
  "matchingSkills": string[],
  "missingSkills": string[],
  "applyRecommendation": boolean,
  "confidenceLevel": "high" | "medium" | "low",
  "tailoringNotes": string (1-2 sentences on what to emphasize in resume/cover letter)
}
Recommend applying only when matchScore >= 65 AND confidenceLevel is "high" or "medium".`

export async function scoreJobMatch(userId: string, skills: string[], jdText: string) {
  return generateJson({
    feature: 'openclaw_match',
    system: OPENCLAW_MATCH_PROMPT,
    prompt: `Student skills: ${JSON.stringify(skills)}\n\nJob description:\n${jdText.slice(0, 4000)}`,
    schema: jobMatchSchema,
    userId,
    maxTokens: 600,
    temperature: 0,
  })
}
