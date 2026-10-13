export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateText } from '@/lib/ai'
import { getUserId, unauthorized, badRequest, serverError, ok, aiFailure } from '@/lib/api'

const SECTIONS = {
  summary: 'a 2-3 sentence professional summary',
  skills: 'a comma-separated list of skills (keep it a single comma-separated line; order the most relevant first)',
  experience: 'work experience / internships, one block per role, bullet lines starting with "• "',
  projects: 'projects, one block per project, bullet lines starting with "• "',
  education: 'education entries, one per line',
  certifications: 'certifications and achievements, one per line',
} as const

const bodySchema = z.object({
  section: z.enum(Object.keys(SECTIONS) as [keyof typeof SECTIONS, ...(keyof typeof SECTIONS)[]]),
  text: z.string().trim().min(10, 'Write something in this section first').max(6000),
  targetJd: z.string().trim().max(12_000).optional(),
})

const SYSTEM = `You improve one section of a student's résumé for ATS systems and recruiters in India.
Rules:
- Keep every fact exactly as given: never add employers, projects, numbers, dates, skills or achievements that are not in the text.
- Tighten wording, start bullets with strong action verbs, remove filler ("passionate", "hard-working", "results-driven").
- If a job description is given, use its keywords only where they truthfully describe what is already there.
- Keep the same structure and line breaks the section uses.
Output ONLY the improved section text: no headings, quotes, markdown or explanation.`

// POST /api/resume-builder/enhance — rewrite one résumé section without adding facts
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')
    const { section, text, targetJd } = parsed.data

    const improved = await generateText({
      feature: 'resume_enhance',
      system: SYSTEM,
      prompt: `Section: ${SECTIONS[section]}\n\nCurrent text:\n${text}${targetJd ? `\n\nTarget job description:\n${targetJd}` : ''}`,
      userId,
      maxTokens: 900,
      temperature: 0.3,
    })
    return ok({ text: improved.replace(/^```[a-z]*\n?|\n?```$/g, '').trim() })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[resume-builder/enhance]', err)
    return serverError()
  }
}
