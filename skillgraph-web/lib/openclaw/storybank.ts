import { generateJson } from '@/lib/ai'
import { interviewStoriesSchema, STORY_THEMES } from '@/lib/ai/schemas'
import { prisma } from '@/lib/prisma'

const EXTRACT_PROMPT = `You are an interview coach. Extract 2-3 STAR+Reflection stories from the candidate's background for the given role. Each story should map to a unique theme.
Return ONLY a valid JSON object: { "stories": [{ "theme": string, "starSituation": string, "starTask": string, "starAction": string, "starResult": string, "starReflection": string }] }
Themes must come from: ${STORY_THEMES.join(' | ')}`

export async function extractStories(
  userId: string,
  role: string,
  company: string,
  resumeText: string,
  skills: string[]
): Promise<void> {
  const { stories } = await generateJson({
    feature: 'story_bank',
    system: EXTRACT_PROMPT,
    prompt: `Role applying for: ${role} at ${company}\nSkills: ${skills.join(', ')}\nResume context: ${resumeText.slice(0, 2000)}`,
    schema: interviewStoriesSchema,
    userId,
    maxTokens: 1500,
    temperature: 0.4,
  })

  const valid = stories.filter(s => (STORY_THEMES as readonly string[]).includes(s.theme))
  if (valid.length === 0) return

  await prisma.interviewStory.createMany({
    data: valid.map(story => ({
      userId,
      company,
      role,
      theme: story.theme,
      starSituation: story.starSituation,
      starTask: story.starTask,
      starAction: story.starAction,
      starResult: story.starResult,
      starReflection: story.starReflection,
    })),
  })
}

export async function getStories(userId: string) {
  return prisma.interviewStory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
