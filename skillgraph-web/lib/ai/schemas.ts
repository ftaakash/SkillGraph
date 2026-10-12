/**
 * Output schemas for each LLM prompt in lib/openai.ts (PROMPTS).
 * They are deliberately lenient about formatting (coercion, defaults) and strict
 * about the shape the UI depends on.
 */
import { z } from 'zod'

const str = z.coerce.string()
const strList = z.array(z.coerce.string()).catch([])
const urgency = z.enum(['high', 'medium', 'low']).catch('medium')
const percent = z.coerce.number().min(0).max(100).catch(0)

export const resumeParseSchema = z.object({
  technical_skills: strList,
  soft_skills: strList,
  tools: strList,
  frameworks: strList,
  projects: z
    .array(z.object({ name: str, tech: strList, description: str.catch('') }))
    .catch([]),
  internships: z
    .array(z.object({ company: str, role: str, duration: str.catch(''), skills: strList }))
    .catch([]),
  education: z
    .object({ degree: str.catch(''), branch: str.catch(''), cgpa: str.catch('') })
    .partial()
    .catch({}),
})
export type ResumeParse = z.infer<typeof resumeParseSchema>

export const gapAnalysisSchema = z.object({
  readiness_percentage: percent,
  verdict: str.catch(''),
  missing_skills: z
    .array(
      z.object({
        skill: z.string().min(1),
        urgency,
        weeks_to_learn: z.coerce.number().int().min(0).catch(2),
        why_important: str.catch(''),
      })
    )
    .catch([]),
  strengths: strList,
  quick_wins: strList,
})

export const sprintDaySchema = z.object({
  day: z.coerce.number().int(),
  focus: str,
  topic: str,
  resource_type: z.enum(['video', 'article', 'practice']).catch('article'),
  resource_title: str,
  resource_url: str,
  time_minutes: z.coerce.number().int().min(0).catch(60),
  mini_task: str,
  checkpoint: str,
})
// Sprint completion is computed as checked/7, so exactly seven days are required
export const sprintSchema = z.array(sprintDaySchema).length(7)

export const projectSuggestionsSchema = z
  .array(
    z.object({
      title: str,
      tagline: str.catch(''),
      difficulty: z.enum(['beginner', 'intermediate']).catch('intermediate'),
      tech_stack: strList,
      core_features: strList,
      github_readme_outline: strList,
      recruiter_signal: str.catch(''),
      time_to_build_weeks: z.coerce.number().min(0).catch(2),
    })
  )
  .min(1)

export const linkedinOptimizationSchema = z.object({
  headline: str,
  about: str,
  skills: strList,
  keywords_added: strList,
  ats_score_estimate_before: percent,
  ats_score_estimate_after: percent,
  improvement_tips: strList,
})

// ─── OpenClaw ───────────────────────────────────────────────────────────────

export const jobMatchSchema = z.object({
  matchScore: z.coerce.number().min(0).max(100).catch(0),
  matchingSkills: strList,
  missingSkills: strList,
  applyRecommendation: z.preprocess(v => v === true || v === 'true', z.boolean()),
  confidenceLevel: z.enum(['high', 'medium', 'low']).catch('low'),
  tailoringNotes: str.catch(''),
})

/** Score out of `max` with a short justification (used per evaluation dimension). */
export const dimensionScoreSchema = (max: number) =>
  z.object({
    score: z.coerce.number().catch(0).transform(n => Math.max(0, Math.min(max, Math.round(n)))),
    reasoning: str.catch(''),
  })

export const evaluationSummarySchema = z.object({
  keyStrengths: strList,
  keyWeaknesses: strList,
  negotiationLeverage: str.catch(''),
})

export const negotiationScriptSchema = z.object({
  title: str,
  openingLine: str,
  mainArgument: str,
  dataPoints: strList,
  closingLine: str,
})

export const STORY_THEMES = ['Leadership', 'Tech', 'Conflict', 'Collaboration', 'Failure', 'Growth'] as const

export const interviewStoriesSchema = z.object({
  stories: z
    .array(
      z.object({
        theme: str, // filtered against STORY_THEMES by the caller
        starSituation: str,
        starTask: str,
        starAction: str,
        starResult: str,
        starReflection: str,
      })
    )
    .max(5),
})

export const jdSkillsSchema = z.array(z.coerce.string()).max(40)
