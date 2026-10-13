import { generateJson } from '@/lib/ai'
import { negotiationScriptSchema } from '@/lib/ai/schemas'
import { prisma } from '@/lib/prisma'

const BASE_CONTEXT = `You are a compensation negotiation coach for students and fresh graduates in Indian tech. Generate a professional, confident, non-aggressive negotiation script for the given scenario.
Rules:
- Use ONLY the candidate facts given. Never invent years of experience, past employers, titles, offers or achievements. A student has internship and project experience, not years of work experience.
- You are given only the candidate's skills, not their projects or internships. Never describe a specific project, internship, employer, open-source contribution or metric. Where one would help, write a placeholder in square brackets for the candidate to fill in, e.g. "[your strongest project and one real result]" or "[your internship: company and what you shipped]".
- Never cite named sources, surveys, reports or years (e.g. "Naukri 2024", "Payscale data") and never state specific market salary figures you were not given. Phrase market points as what the candidate should check and say, e.g. "Comparable fresher offers for this role in Bengaluru that I have seen are higher" or "[insert the range you found on 2-3 job boards]".
- Keep the ask realistic for a fresher: a modest increase or a non-salary ask (joining bonus, relocation, start date, learning budget).
Return ONLY valid JSON: { "title": string, "openingLine": string, "mainArgument": string, "dataPoints": string[], "closingLine": string }`

export async function generateNegotiationScripts(
  userId: string,
  listingId: string,
  role: string,
  company: string,
  offeredCtcLpa: number,
  competingOfferCtcLpa: number | null,
  skills: string[],
  location: string
) {
  const skillStr = skills.slice(0, 10).join(', ')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { year: true, branch: true, college: true } })
  const candidate = `Candidate: student / fresh graduate${user?.year ? `, year ${user.year}` : ''}${user?.branch ? `, ${user.branch}` : ''}${user?.college ? ` at ${user.college}` : ''}. No full-time work experience unless stated.`
  const script = (prompt: string) =>
    generateJson({
      feature: 'negotiation',
      system: BASE_CONTEXT,
      prompt,
      schema: negotiationScriptSchema,
      userId,
      maxTokens: 600,
      temperature: 0.4,
    })

  const [s1, s2, s3] = await Promise.all([
    script(`${candidate} Scenario: Geographic discount push-back. Role: ${role} at ${company}. Location offered: ${location}. Offered CTC: ₹${offeredCtcLpa} LPA. Skills: ${skillStr}.`),
    script(`${candidate} Scenario: Competing offer leverage. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. ${competingOfferCtcLpa ? `Competing offer: ₹${competingOfferCtcLpa} LPA.` : 'No competing offer — do not invent one; argue from the role, the skills and a range the candidate should look up.'}`),
    script(`${candidate} Scenario: Skill premium argument. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. Rare/in-demand skills: ${skillStr}.`),
  ])

  return prisma.negotiationScript.create({
    data: { userId, listingId, script1: s1, script2: s2, script3: s3 },
  })
}

export async function getNegotiationScript(userId: string, listingId: string) {
  return prisma.negotiationScript.findFirst({
    where: { userId, listingId },
    orderBy: { createdAt: 'desc' },
  })
}
