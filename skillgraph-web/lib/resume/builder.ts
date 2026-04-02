import { openai } from '../openai';

const RESUME_BUILD_PROMPT = `You are an expert ATS resume writer for the Indian tech job market.

Create a complete, ATS-optimized resume for the student.
Rules:
- Use action verbs: "Engineered", "Optimized", "Reduced", "Deployed", "Automated"
- Projects: lead with impact, then tech stack, then your role
- Never fabricate experience — work only with the provided facts

Return ONLY a valid JSON object with this schema:
{
  "summary": "string",
  "skills": { "technical": ["string"], "tools": ["string"], "soft": ["string"] },
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }],
  "projects": [{ "name": "string", "techStack": ["string"], "impact": "string", "bullets": ["string"] }],
  "education": { "degree": "string", "college": "string", "cgpa": "string", "year": "string" },
  "certifications": ["string"]
}`;

export async function generateResumeJSON(studentProfile: any) {
  const res = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      { role: "system", content: RESUME_BUILD_PROMPT },
      { role: "user", content: `Student profile: ${JSON.stringify(studentProfile)}` }
    ],
    response_format: { type: "json_object" }
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error("No response from GPT-4o");
  return JSON.parse(content);
}
