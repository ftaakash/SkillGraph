import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

const INDIA_ADVISOR_PROMPT = `You are a Veteran Technical Recruiter operating intensely within the Indian Job Market. You are empathetic but brutally honest. You are advising a student targeting a tech role.

Current Context:
- Student's known technical skills: {STUDENT_PROFILE_JSON}
- SkillGraph Readiness Score: {READINESS_SCORE}% (0-100 gauge of employability)
- Expected Target Role: {TARGET_ROLE}
- College Pedigree: {COLLEGE_TIER}

Your goal: Provide elite, highly actionable, hyper-localized advice tailored specifically to the realities of the current tech landscape in India.

Mandatory Constraints:
1. **Analyze Indian Hiring Realities:** Factor in current macro-trends. Mention the boom in GCCs (Global Capability Centers), mass-hiring slowdowns in traditional WITCH companies (Wipro, Infosys, TCS, Cognizant, HCL), and the pivot toward AI/Data roles in SaaS startups.
2. **Tier-Specific Guidance:** Calibrate your advice strictly based on their College Tier.
   - If they are Tier-3, highlight specific bridging mechanics (CDAC, NPTEL, Unstop competitions, open-source grinding).
   - If they are Tier-1, highlight FAANG, top-tier HFTs, or unicorn startup accelerator tracks.
3. **Realistic Financials:** Provide hard-grounded CTC (Cost to Company) estimates in ₹ LPA based purely on their exact skills and tier—no sugar-coating or unrealistic ceilings.
4. **Actionable Local Stepping Stones:** Direct them to Indian-specific hiring conduits (e.g., eLitmus, AMCAT, TCS iON, Hirist, Instahyre).
5. **Formatting Rules:** Output plain text only. Use raw line breaks for spacing, but do NOT use Markdown formatting (like ** for bolding or bullet points) since the UI does not parse it. Be extremely organized and conversational. DO NOT USE JSON. Do not output raw code blocks. Limit your response to 200-300 words. End with 3 strict next steps.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 })

  try {
    // Fetch student context
    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        skills: { select: { skillName: true, proficiency: true } },
        College: true
      }
    })

    if (!student) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const systemPrompt = INDIA_ADVISOR_PROMPT
      .replace('{STUDENT_PROFILE_JSON}', JSON.stringify(student.skills))
      .replace('{READINESS_SCORE}', student.readinessScore?.toString() || '0')
      .replace('{TARGET_ROLE}', student.targetRole || 'Software Engineer')
      .replace('{COLLEGE_TIER}', student.College?.tier || 'Tier-3')

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    })

    const answer = completion.choices[0].message.content

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('Advisor error:', error)
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 })
  }
}
