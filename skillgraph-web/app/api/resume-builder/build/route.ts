export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { extractText } from 'unpdf'
import { prisma } from '@/lib/prisma'
import { generateJson } from '@/lib/ai'
import { resumeDraftSchema } from '@/lib/ai/schemas'
import { readPrivateFile } from '@/lib/storage'
import { getUserId, unauthorized, badRequest, serverError, ok, aiFailure } from '@/lib/api'

const RESUME_BUILD_PROMPT = `You are an expert ATS résumé writer for the Indian tech job market.
Write a complete résumé for the student, tailored to the target job description.
Rules:
- Use ONLY facts present in the student's résumé text and profile. Never invent employers, projects, dates, numbers, certifications or skills.
- Reorder and reword to match the job description: lead with the most relevant skills and projects, mirror its keywords where they are truthful.
- Bullets start with strong action verbs (Built, Reduced, Deployed, Automated) and keep any real numbers from the source.
- Summary: 2-3 sentences, no filler such as "passionate" or "results-driven".
Return ONLY a JSON object:
{ "summary": string, "skills": { "technical": string[], "tools": string[] },
  "experience": [{ "company": string, "role": string, "duration": string, "bullets": string[] }],
  "projects": [{ "name": string, "techStack": string[], "impact": string, "bullets": string[] }],
  "education": { "degree": string, "college": string, "cgpa": string, "year": string },
  "certifications": string[] }`

const bodySchema = z.object({ targetJd: z.string().trim().min(50, 'Paste the full job description (at least a few sentences)').max(12_000) })

/** Text of the student's uploaded résumé, or '' if there is none or it can't be read. */
async function resumeText(ref: string | null) {
  if (!ref) return ''
  try {
    const bytes = await readPrivateFile(ref)
    if (!bytes) return ''
    const { text } = await extractText(bytes)
    return (Array.isArray(text) ? text.join('\n') : text ?? '').slice(0, 8000)
  } catch (err) {
    console.warn('[resume-builder/build] could not read stored résumé:', (err as Error).message)
    return ''
  }
}

// POST /api/resume-builder/build — a JD-tailored résumé draft from the student's own résumé and profile
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, college: true, branch: true, year: true, cgpa: true, targetRole: true, resumeUrl: true,
        skills: { select: { skillName: true, category: true } },
        AcademicProfile: { select: { program: true, department: true } },
      },
    })
    if (!user) return unauthorized()

    const source = await resumeText(user.resumeUrl)
    if (!source && user.skills.length === 0) {
      return badRequest('Upload your résumé on the Dashboard first, so the draft is built from your real experience.')
    }

    const profile = {
      name: user.name,
      college: user.college,
      degree: user.AcademicProfile?.program ?? null,
      branch: user.branch ?? user.AcademicProfile?.department ?? null,
      year: user.year,
      cgpa: user.cgpa,
      targetRole: user.targetRole,
      skills: user.skills.map(s => s.skillName),
    }
    const resume = await generateJson({
      feature: 'resume_build',
      system: RESUME_BUILD_PROMPT,
      prompt: `Student profile:\n${JSON.stringify(profile)}\n\nStudent's résumé text:\n${source || '(not available — use the profile only)'}\n\nTarget job description:\n${parsed.data.targetJd}`,
      schema: resumeDraftSchema,
      userId,
      maxTokens: 2500,
      temperature: 0.2,
    })
    return ok({ resume, usedUploadedResume: Boolean(source) })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[resume-builder/build]', err)
    return serverError()
  }
}
