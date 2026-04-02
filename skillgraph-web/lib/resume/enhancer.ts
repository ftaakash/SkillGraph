import { openai } from '../openai';

const RESUME_ENHANCE_PROMPT = `You are an expert ATS resume enhancer for the Indian tech job market.
You will receive a current resume JSON and a Target JD.

Rules:
- Use exact keywords from the JD (verbatim where truthful)
- Quantify all achievements (%, ₹, users, milliseconds)
- Keep summary to 3 sentences: role aspiration, top 3 skills, measurable achievement
- Skills section: match JD skill names exactly, not synonyms

Return ONLY a valid JSON object with this schema:
{
  "summary": "string",
  "skills": { "technical": ["string"], "tools": ["string"], "soft": ["string"] },
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }],
  "projects": [{ "name": "string", "techStack": ["string"], "impact": "string", "bullets": ["string"] }],
  "education": { "degree": "string", "college": "string", "cgpa": "string", "year": "string" },
  "certifications": ["string"],
  "atsScore": 85,
  "keywordsUsed": ["string"],
  "keywordsMissed": ["string"]
}`;

export async function enhanceResumeWithJD(currentResume: any, targetJd: string) {
  const res = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      { role: "system", content: RESUME_ENHANCE_PROMPT },
      { role: "user", content: `Current Resume: ${JSON.stringify(currentResume)}\n\nTarget JD:\n${targetJd}` }
    ],
    response_format: { type: "json_object" }
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error("No response from GPT-4o");
  return JSON.parse(content);
}
