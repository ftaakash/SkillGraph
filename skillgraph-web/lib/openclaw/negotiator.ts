import { generateJson } from '@/lib/ai'
import { negotiationScriptSchema } from '@/lib/ai/schemas'
import { prisma } from '@/lib/prisma'

const BASE_CONTEXT = `You are a senior compensation negotiation coach specialising in Indian tech salaries. Generate a professional, confident, non-aggressive negotiation script for the given scenario. Return ONLY valid JSON: { "title": string, "openingLine": string, "mainArgument": string, "dataPoints": string[], "closingLine": string }`

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
    script(`Scenario: Geographic discount push-back. Role: ${role} at ${company}. Location offered: ${location}. Offered CTC: ₹${offeredCtcLpa} LPA. Skills: ${skillStr}.`),
    script(`Scenario: Competing offer leverage. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. ${competingOfferCtcLpa ? `Competing offer: ₹${competingOfferCtcLpa} LPA.` : 'No competing offer — use market data instead.'}`),
    script(`Scenario: Skill premium argument. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. Rare/in-demand skills: ${skillStr}.`),
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
