export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PROMPTS } from '@/lib/openai'
import { generateJson } from '@/lib/ai'
import { resumeParseSchema } from '@/lib/ai/schemas'
import { putPrivateFile, deletePrivateFile } from '@/lib/storage'
import { getUserId, unauthorized, badRequest, serverError, ok, aiFailure } from '@/lib/api'
import { extractText } from 'unpdf'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return badRequest('No file uploaded')
    if (file.type !== 'application/pdf') return badRequest('Only PDF files are accepted')
    if (file.size > MAX_BYTES) return badRequest('File must be under 5MB')

    const bytes = new Uint8Array(await file.arrayBuffer())
    // Content check, not just the client-declared MIME type
    if (Buffer.from(bytes.subarray(0, 5)).toString('latin1') !== '%PDF-') {
      return badRequest('File is not a valid PDF')
    }

    // 1. Parse first — nothing is changed for the user if extraction or the AI fails
    const { text: rawText } = await extractText(new Uint8Array(bytes))
    const resumeText = (Array.isArray(rawText) ? rawText.join('\n') : rawText ?? '').slice(0, 6000)
    if (resumeText.trim().length < 50) {
      return badRequest('Could not read text from this PDF. Please upload a text-based (not scanned) resume.')
    }

    const parsed = await generateJson({
      feature: 'resume_parse',
      system: PROMPTS.RESUME_PARSER,
      prompt: `Parse this resume:\n\n${resumeText}`,
      schema: resumeParseSchema,
      userId,
      temperature: 0,
    })

    // 2. Store the original privately
    const previous = await prisma.user.findUnique({ where: { id: userId }, select: { resumeUrl: true } })
    const resumeUrl = await putPrivateFile('resumes', `upload_${userId}_${Date.now()}.pdf`, bytes)

    type SkillInput = { userId: string; skillName: string; category: string }
    const toSkills = (names: string[], category: string): SkillInput[] =>
      names.map(s => s.trim()).filter(Boolean).map(skillName => ({ userId, skillName, category }))
    const allSkills: SkillInput[] = [
      ...toSkills(parsed.technical_skills, 'technical'),
      ...toSkills(parsed.soft_skills, 'soft'),
      ...toSkills(parsed.tools, 'tool'),
      ...toSkills(parsed.frameworks, 'framework'),
    ]

    // 3. Replace the user's derived data atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { resumeUrl, sprintsCompleted: 0, readinessScore: 0 },
      }),
      prisma.sprint.deleteMany({ where: { userId } }),
      prisma.skillGap.deleteMany({ where: { userId } }),
      prisma.skillProfile.deleteMany({ where: { userId } }),
      prisma.skillProfile.createMany({ data: allSkills }),
    ])

    // The replaced résumé is no longer referenced anywhere; don't keep personal documents we don't use
    if (previous?.resumeUrl && previous.resumeUrl !== resumeUrl) {
      const removed = await deletePrivateFile(previous.resumeUrl)
      if (!removed) console.warn('[resume/upload] could not delete the replaced résumé file')
    }

    return ok({ skillsExtracted: allSkills.length, parsed })
  } catch (err) {
    const failure = aiFailure(err)
    if (failure) return failure
    console.error('[resume/upload]', err)
    return serverError()
  }
}
