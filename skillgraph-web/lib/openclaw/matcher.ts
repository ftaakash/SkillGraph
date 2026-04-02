import { openai } from '../openai';

const OPENCLAW_MATCH_PROMPT = `You are a senior technical recruiter assessing job-candidate fit for the Indian tech market.
You will receive a student's skill profile and a job description.
Return ONLY a valid JSON object. No markdown, no explanation, no backticks.
Schema:
{
  "matchScore": 85, // number (0-100)
  "matchingSkills": ["string"],
  "missingSkills": ["string"],
  "applyRecommendation": true,
  "confidenceLevel": "high", // "high" | "medium" | "low"
  "tailoringNotes": "string (1-2 sentences on what to emphasize in resume/cover letter)",
  "indiaContext": {
    "companyTier": "FAANG", // "FAANG" | "Unicorn" | "MNC" | "Service" | "Startup" | "Unknown"
    "interviewStyle": "DSA-heavy", // "DSA-heavy" | "System Design" | "Balanced" | "Consulting"
    "ctcRealism": true
  }
}
Apply only when matchScore >= 65 AND confidenceLevel is "high" or "medium".`;

export async function scoreJobMatch(studentProfile: any, jdText: string) {
  const res = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      { role: "system", content: OPENCLAW_MATCH_PROMPT },
      { role: "user", content: `Student profile: ${JSON.stringify(studentProfile)}\n\nJob description:\n${jdText}` }
    ],
    response_format: { type: "json_object" }
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error("No response from GPT-4o matcher");
  return JSON.parse(content);
}
