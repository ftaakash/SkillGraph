import { callGPT } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DimensionScore {
  score: number
  maxScore: number
  reasoning: string
}

export interface EvaluationResult {
  totalScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: Record<string, DimensionScore>
  recommendation: 'AutoApply' | 'ReviewAndApply' | 'Skip'
  keyStrengths: string[]
  keyWeaknesses: string[]
  negotiationLeverage: string
}

const COMPANY_TIER_SCORES: Record<string, number> = {
  FAANG: 15,
  Unicorn: 12,
  MNC: 9,
  Startup: 7,
  Service: 5,
}

// ─── Helper: letter grade ────────────────────────────────────────────────────

function toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

function toRecommendation(grade: string): 'AutoApply' | 'ReviewAndApply' | 'Skip' {
  if (grade === 'A') return 'AutoApply'
  if (grade === 'B' || grade === 'C') return 'ReviewAndApply'
  return 'Skip'
}

// ─── Main scorer ────────────────────────────────────────────────────────────

export async function scoreJobListing(
  listing: {
    id: string
    company: string
    role: string
    location: string | null
    ctcBand: string | null
    jdText: string
    scrapedAt: Date
  },
  student: {
    id: string
    targetRole: string | null
    skills: { skillName: string; proficiency: string }[]
    sprints: { completionPercentage: number }[]
    cgpa: number | null
    branch: string | null
  },
  config: {
    preferredCities: string[]
    minCtcLpa: number
  }
): Promise<EvaluationResult> {
  const dimensions: Record<string, DimensionScore> = {}
  let total = 0

  // ── D1: Role-Skill Match (25 pts) — AI ──
  const skillNames = student.skills.map(s => s.skillName).join(', ')
  const d1Raw = await callGPT(
    `You are a hiring manager. Score how well these skills match the JD. Return JSON: { "score": number (0-25), "reasoning": string }`,
    `Skills: ${skillNames}\nJD: ${listing.jdText.slice(0, 1500)}`,
    'llama-3.3-70b-versatile',
    400
  )
  const d1 = JSON.parse(d1Raw)
  dimensions['Role-Skill Match'] = { score: d1.score ?? 0, maxScore: 25, reasoning: d1.reasoning ?? '' }
  total += d1.score ?? 0

  // ── D2: Company Tier (15 pts) — rule-based ──
  const tierKw = ['FAANG', 'Unicorn', 'MNC', 'Startup', 'Service']
  const tier = tierKw.find(t => listing.jdText.toLowerCase().includes(t.toLowerCase()) ||
    listing.company.toLowerCase().includes(t.toLowerCase())) ?? 'Startup'
  const d2Score = COMPANY_TIER_SCORES[tier] ?? 7
  dimensions['Company Tier'] = { score: d2Score, maxScore: 15, reasoning: `Detected tier: ${tier}` }
  total += d2Score

  // ── D3: CTC vs Market (15 pts) — rule-based ──
  const ctcMatch = listing.ctcBand?.match(/(\d+(?:\.\d+)?)/)?.[1]
  const offeredCtc = ctcMatch ? parseFloat(ctcMatch) : 0
  const d3Score = offeredCtc === 0 ? 8 // unknown → neutral
    : offeredCtc >= config.minCtcLpa * 1.2 ? 15
    : offeredCtc >= config.minCtcLpa ? 10
    : offeredCtc >= config.minCtcLpa * 0.8 ? 5
    : 0
  dimensions['CTC vs Market'] = { score: d3Score, maxScore: 15, reasoning: offeredCtc ? `Offered ~${offeredCtc} LPA vs min ${config.minCtcLpa} LPA` : 'CTC not specified' }
  total += d3Score

  // ── D4: Growth Trajectory (10 pts) — AI ──
  const d4Raw = await callGPT(
    `Score 0-10 the growth trajectory for a fresh grad from this JD. Return JSON: { "score": number, "reasoning": string }`,
    listing.jdText.slice(0, 800),
    'llama-3.3-70b-versatile',
    300
  )
  const d4 = JSON.parse(d4Raw)
  dimensions['Growth Trajectory'] = { score: d4.score ?? 5, maxScore: 10, reasoning: d4.reasoning ?? '' }
  total += d4.score ?? 5

  // ── D5: Interview Complexity (10 pts) — rule-based ──
  const avgCompletion = student.sprints.length
    ? student.sprints.reduce((a, s) => a + s.completionPercentage, 0) / student.sprints.length
    : 50
  const d5Score = Math.round((avgCompletion / 100) * 10)
  dimensions['Interview Complexity'] = { score: d5Score, maxScore: 10, reasoning: `Sprint avg completion: ${avgCompletion.toFixed(0)}%` }
  total += d5Score

  // ── D6: Location (8 pts) — rule-based ──
  const loc = listing.location?.toLowerCase() ?? ''
  const cityMatch = config.preferredCities.some(c => loc.includes(c.toLowerCase()))
  const isRemote = loc.includes('remote')
  const d6Score = cityMatch || isRemote ? 8 : loc === '' ? 4 : 2
  dimensions['Location Preference'] = { score: d6Score, maxScore: 8, reasoning: cityMatch ? 'Preferred city match' : isRemote ? 'Remote role' : 'Location mismatch' }
  total += d6Score

  // ── D7: Stack Excitement (7 pts) — rule-based ──
  const jdLower = listing.jdText.toLowerCase()
  const studentSkillsLower = student.skills.map(s => s.skillName.toLowerCase())
  const matchedSkills = studentSkillsLower.filter(sk => jdLower.includes(sk))
  const d7Score = Math.min(7, Math.round((matchedSkills.length / Math.max(studentSkillsLower.length, 1)) * 7 * 1.5))
  dimensions['Stack Excitement'] = { score: d7Score, maxScore: 7, reasoning: `${matchedSkills.length} skills overlapping JD` }
  total += d7Score

  // ── D8: Application Timing (5 pts) — rule-based ──
  const ageMs = Date.now() - listing.scrapedAt.getTime()
  const ageDays = ageMs / 86400000
  const d8Score = ageDays < 7 ? 5 : ageDays < 14 ? 3 : ageDays < 30 ? 1 : 0
  dimensions['Application Timing'] = { score: d8Score, maxScore: 5, reasoning: `Posted ${Math.round(ageDays)} days ago` }
  total += d8Score

  // ── D9: Culture Signal (3 pts) — AI ──
  const d9Raw = await callGPT(
    `Score 0-3 the company culture based on JD signals. Return JSON: { "score": number, "reasoning": string }`,
    `Company: ${listing.company}\nJD excerpt: ${listing.jdText.slice(0, 500)}`,
    'llama-3.3-70b-versatile',
    200
  )
  const d9 = JSON.parse(d9Raw)
  dimensions['Culture Signal'] = { score: d9.score ?? 1, maxScore: 3, reasoning: d9.reasoning ?? '' }
  total += d9.score ?? 1

  // ── D10: Pipeline Integrity (2 pts) — DB check ──
  const duplicate = await prisma.openClawApplication.findFirst({
    where: { userId: student.id, status: { not: 'Rejected' } },
  })
  // Check via listing lookup
  const dupListing = await prisma.openClawListing.findFirst({
    where: { company: listing.company, role: listing.role },
  })
  const isDup = !!duplicate && !!dupListing
  const d10Score = isDup ? 0 : 2
  dimensions['Pipeline Integrity'] = { score: d10Score, maxScore: 2, reasoning: isDup ? 'Duplicate application detected' : 'No duplicate found' }
  total += d10Score

  // ── Final grade & recommendation ──
  const grade = toGrade(total)
  const recommendation = toRecommendation(grade)

  // ── Key strengths/weaknesses from AI ──
  const summaryRaw = await callGPT(
    `Given these evaluation scores, list 3 key strengths and 3 key weaknesses, plus one negotiation leverage point. Return JSON: { "keyStrengths": string[], "keyWeaknesses": string[], "negotiationLeverage": string }`,
    `Total: ${total}/100 Grade: ${grade}\nDimensions: ${JSON.stringify(dimensions)}`,
    'llama-3.3-70b-versatile',
    500
  )
  const summary = JSON.parse(summaryRaw)

  return {
    totalScore: total,
    grade,
    dimensions,
    recommendation,
    keyStrengths: summary.keyStrengths ?? [],
    keyWeaknesses: summary.keyWeaknesses ?? [],
    negotiationLeverage: summary.negotiationLeverage ?? '',
  }
}
