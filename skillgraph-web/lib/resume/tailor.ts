/**
 * Job-tailored résumés built only from the student's own résumé and profile (ADR-004).
 * Shared by the Résumé Builder, the nightly OpenClaw agent and the browser extension.
 */
import { extractText } from 'unpdf'
import { prisma } from '@/lib/prisma'
import { generateJson } from '@/lib/ai'
import { resumeDraftSchema, type ResumeDraft } from '@/lib/ai/schemas'
import { readPrivateFile, putPrivateFile } from '@/lib/storage'
import { generateResumePDFBuffer } from '@/lib/resume/exporter'

export const RESUME_TAILOR_PROMPT = `You are an expert ATS résumé writer for the Indian tech job market.
Write a complete résumé for the student, tailored to the target job description.
Rules:
- Use ONLY facts present in the student's résumé text and profile. Never invent employers, projects, dates, numbers, certifications or skills.
- Reorder and reword to match the job description: lead with the most relevant skills and projects, mirror its keywords where they are truthful.
- Bullets start with strong action verbs (Built, Reduced, Deployed, Automated) and keep any real numbers from the source.
- Summary: 2-3 sentences, no filler such as "passionate" or "results-driven", and no third-person pronouns.
Return ONLY a JSON object:
{ "summary": string, "skills": { "technical": string[], "tools": string[] },
  "experience": [{ "company": string, "role": string, "duration": string, "bullets": string[] }],
  "projects": [{ "name": string, "techStack": string[], "impact": string, "bullets": string[] }],
  "education": { "degree": string, "college": string, "cgpa": string, "year": string },
  "certifications": string[] }   // certifications, awards and achievements (hackathons, competitions, ranks) from the source`

export class NoResumeSource extends Error {}

/** Text of a stored résumé, or '' if there is none or it can't be read. */
export async function resumeSourceText(ref: string | null): Promise<string> {
  if (!ref) return ''
  try {
    const bytes = await readPrivateFile(ref)
    if (!bytes) return ''
    const { text } = await extractText(bytes)
    return (Array.isArray(text) ? text.join('\n') : text ?? '').slice(0, 8000)
  } catch (err) {
    console.warn('[resume/tailor] could not read stored résumé:', (err as Error).message)
    return ''
  }
}

async function loadStudent(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, college: true, branch: true, year: true, cgpa: true, targetRole: true,
      resumeUrl: true, linkedin: true, github: true,
      skills: { select: { skillName: true, category: true } },
      AcademicProfile: { select: { program: true, department: true } },
      OpenClawConfig: { select: { applicationEmail: true, phone: true } },
    },
  })
}
type Student = NonNullable<Awaited<ReturnType<typeof loadStudent>>>

/** A JD-tailored draft. Throws NoResumeSource when there is nothing truthful to build from. */
export async function tailorResumeDraft(userId: string, jdText: string, student?: Student) {
  const user = student ?? (await loadStudent(userId))
  if (!user) throw new Error(`Student ${userId} not found`)
  const source = await resumeSourceText(user.resumeUrl)
  if (!source && user.skills.length === 0) throw new NoResumeSource('Upload your résumé first')

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
  const draft = await generateJson({
    feature: 'resume_build',
    system: RESUME_TAILOR_PROMPT,
    prompt: `Student profile:\n${JSON.stringify(profile)}\n\nStudent's résumé text:\n${source || '(not available — use the profile only)'}\n\nTarget job description:\n${jdText.slice(0, 12_000)}`,
    schema: resumeDraftSchema,
    userId,
    maxTokens: 2500,
    temperature: 0.2,
  })
  return { draft, usedUploadedResume: Boolean(source), user }
}

/** The PDF exporter's input for a draft. */
export function draftToExportData(draft: ResumeDraft, user: Student) {
  const edu = draft.education
  return {
    name: user.name || 'Student',
    email: user.OpenClawConfig?.applicationEmail || user.email,
    tagline: user.targetRole || '',
    phone: user.OpenClawConfig?.phone || '',
    linkedin: user.linkedin || '',
    github: user.github || '',
    summary: draft.summary,
    skills: draft.skills,
    experience: draft.experience.map(e => ({ ...e, location: '' })),
    projects: draft.projects.map(p => ({
      name: p.name,
      techStack: p.techStack,
      date: '',
      bullets: [p.impact, ...p.bullets].filter(Boolean),
    })),
    education: edu.degree || edu.college
      ? [{ degree: edu.degree, college: edu.college || user.college || '', cgpa: edu.cgpa, year: edu.year, location: '' }]
      : [],
    achievements: draft.certifications,
    activities: [],
  }
}

/**
 * Builds a tailored résumé PDF for one job, stores it privately and records it as a résumé version.
 * Returns the version id and the PDF bytes.
 */
export async function createTailoredResume(userId: string, job: { company: string; role: string; jdText: string; sourceUrl?: string }, atsScore?: number) {
  const { draft, user } = await tailorResumeDraft(userId, `${job.role} at ${job.company}\n\n${job.jdText}`)
  const pdf = new Uint8Array(await generateResumePDFBuffer(draftToExportData(draft, user)))
  const id = `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const ref = await putPrivateFile('resumes', `${id}.pdf`, pdf)
  const version = await prisma.resumeVersion.create({
    data: { id, userId, cloudinaryUrl: ref, targetJd: job.sourceUrl ?? `${job.role} at ${job.company}`, atsScore: atsScore ?? null, generatedBy: 'AI' },
  })
  return { resumeVersionId: version.id, pdf, fileName: resumeFileName(user.name, job.company) }
}

/** e.g. "Asha_Rao_Resume_Acme.pdf" — safe for upload fields and storage. */
export function resumeFileName(name: string | null, company: string) {
  const clean = (s: string) => s.normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  return `${clean(name || 'Resume') || 'Resume'}_Resume_${clean(company) || 'Job'}.pdf`
}
