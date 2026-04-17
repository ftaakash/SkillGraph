import { callGPT } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

const BASE_CONTEXT = `You are a senior compensation negotiation coach specialising in Indian tech salaries. Generate a professional, confident, non-aggressive negotiation script for the given scenario. Return ONLY valid JSON.`

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

  // Script 1: Geographic Pushback
  const s1Raw = await callGPT(
    BASE_CONTEXT,
    `Scenario: Geographic discount push-back. Role: ${role} at ${company}. Location offered: ${location}. Offered CTC: ₹${offeredCtcLpa} LPA. Skills: ${skillStr}.
Return JSON: { "title": string, "openingLine": string, "mainArgument": string, "dataPoints": string[], "closingLine": string }`,
    'llama-3.3-70b-versatile',
    600
  )

  // Script 2: Competing Offer
  const s2Raw = await callGPT(
    BASE_CONTEXT,
    `Scenario: Competing offer leverage. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. ${competingOfferCtcLpa ? `Competing offer: ₹${competingOfferCtcLpa} LPA.` : 'No competing offer — use market data instead.'}
Return JSON: { "title": string, "openingLine": string, "mainArgument": string, "dataPoints": string[], "closingLine": string }`,
    'llama-3.3-70b-versatile',
    600
  )

  // Script 3: Skill Premium
  const s3Raw = await callGPT(
    BASE_CONTEXT,
    `Scenario: Skill premium argument. Role: ${role} at ${company}. Offered CTC: ₹${offeredCtcLpa} LPA. Rare/in-demand skills: ${skillStr}.
Return JSON: { "title": string, "openingLine": string, "mainArgument": string, "dataPoints": string[], "closingLine": string }`,
    'llama-3.3-70b-versatile',
    600
  )

  const [s1, s2, s3] = [JSON.parse(s1Raw), JSON.parse(s2Raw), JSON.parse(s3Raw)]

  const record = await prisma.negotiationScript.create({
    data: { userId, listingId, script1: s1, script2: s2, script3: s3 },
  })

  return record
}

export async function getNegotiationScript(userId: string, listingId: string) {
  return prisma.negotiationScript.findFirst({
    where: { userId, listingId },
    orderBy: { createdAt: 'desc' },
  })
}
