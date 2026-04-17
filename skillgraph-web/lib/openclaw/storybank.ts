import { callGPT } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

const THEMES = ['Leadership', 'Tech', 'Conflict', 'Collaboration', 'Failure', 'Growth']

const EXTRACT_PROMPT = `You are an interview coach. Extract 2-3 STAR+Reflection stories from the candidate's background for the given role. Each story should map to a unique theme.
Return ONLY a valid JSON array: [{ "theme": string, "starSituation": string, "starTask": string, "starAction": string, "starResult": string, "starReflection": string }]
Themes must come from: Leadership | Tech | Conflict | Collaboration | Failure | Growth`

export async function extractStories(
  userId: string,
  role: string,
  company: string,
  resumeText: string,
  skills: string[]
): Promise<void> {
  const raw = await callGPT(
    EXTRACT_PROMPT,
    `Role applying for: ${role} at ${company}\nSkills: ${skills.join(', ')}\nResume context: ${resumeText.slice(0, 2000)}`,
    'llama-3.3-70b-versatile',
    1500
  )

  let stories: Array<{
    theme: string
    starSituation: string
    starTask: string
    starAction: string
    starResult: string
    starReflection: string
  }> = []

  try {
    stories = JSON.parse(raw)
  } catch {
    return
  }

  for (const story of stories) {
    if (!THEMES.includes(story.theme)) continue
    await prisma.interviewStory.create({
      data: {
        userId,
        company,
        role,
        theme: story.theme,
        starSituation: story.starSituation,
        starTask: story.starTask,
        starAction: story.starAction,
        starResult: story.starResult,
        starReflection: story.starReflection,
      },
    })
  }
}

export async function getStories(userId: string) {
  return prisma.interviewStory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
