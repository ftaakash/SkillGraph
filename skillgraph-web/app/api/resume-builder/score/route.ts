import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// POST — compute ATS score given resume sections + target JD
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sections, targetJd } = body

  if (!sections) {
    return NextResponse.json({ error: 'Resume sections required' }, { status: 400 })
  }

  // Compute ATS score breakdown
  const jdWords = (targetJd || '').toLowerCase().split(/\W+/).filter(Boolean)
  const jdKeywords = new Set(jdWords.filter((w: string) => w.length > 3))

  // Flatten all resume content
  const allContent = Object.values(sections).map((s: any) => {
    if (typeof s === 'string') return s.toLowerCase()
    if (typeof s === 'object' && s !== null) return JSON.stringify(s).toLowerCase()
    return ''
  }).join(' ')

  const contentWords = allContent.split(/\W+/).filter(Boolean)

  // 1. Keyword Match (0-40)
  let keywordMatches = 0
  jdKeywords.forEach(kw => { if (allContent.includes(kw as string)) keywordMatches++ })
  const keywordScore = jdKeywords.size > 0
    ? Math.round((keywordMatches / jdKeywords.size) * 40)
    : 20

  // 2. Format Score (0-20) — check section completeness
  const requiredSections = ['summary', 'skills', 'experience', 'education', 'projects']
  const presentSections = requiredSections.filter(s => sections[s] && String(sections[s]).trim().length > 10)
  const formatScore = Math.round((presentSections.length / requiredSections.length) * 20)

  // 3. Quantification (0-20) — check for numbers in content
  const numberMatches = allContent.match(/\d+/g) ?? []
  const quantScore = Math.min(Math.round(numberMatches.length * 2), 20)

  // 4. Action Verbs (0-10)
  const actionVerbs = ['developed', 'implemented', 'designed', 'managed', 'led', 'created', 'built', 'optimized', 'architected', 'deployed', 'integrated', 'automated', 'improved', 'reduced', 'increased', 'analyzed', 'delivered', 'mentored', 'coordinated', 'streamlined']
  const verbMatches = actionVerbs.filter(v => allContent.includes(v)).length
  const actionScore = Math.min(verbMatches, 10)

  // 5. Section Completeness (0-10)
  const completenessScore = Math.round((presentSections.length / requiredSections.length) * 10)

  const total = keywordScore + formatScore + quantScore + actionScore + completenessScore

  return NextResponse.json({
    score: total,
    breakdown: {
      keywordMatch: { score: keywordScore, max: 40, matchedCount: keywordMatches, totalKeywords: jdKeywords.size },
      format: { score: formatScore, max: 20, presentSections: presentSections.length, requiredSections: requiredSections.length },
      quantification: { score: quantScore, max: 20, numbersFound: numberMatches.length },
      actionVerbs: { score: actionScore, max: 10, verbsFound: verbMatches },
      completeness: { score: completenessScore, max: 10 },
    },
  })
}
