export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callGPT, PROMPTS } from '@/lib/openai'
import { getUserId, unauthorized, badRequest, serverError, ok } from '@/lib/api'
import { v2 as cloudinary } from 'cloudinary'
import { extractText } from 'unpdf'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return badRequest('No file uploaded')
    if (file.type !== 'application/pdf') return badRequest('Only PDF files are accepted')
    if (file.size > 5 * 1024 * 1024) return badRequest('File must be under 5MB')

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: 'skillgraph/resumes', format: 'pdf' },
        (err, result) => {
          if (err || !result) return reject(err)
          resolve(result as { secure_url: string })
        }
      ).end(buffer)
    })

    const resumeUrl = uploadResult.secure_url

    await prisma.user.update({
      where: { id: userId },
      data: { resumeUrl, sprintsCompleted: 0, readinessScore: 0 },
    })

    // Wipe old entities tied to previous skills
    await prisma.sprint.deleteMany({ where: { userId } })
    await prisma.skillGap.deleteMany({ where: { userId } })

    // Parse PDF text using unpdf (canvas-free)
    const { text: rawText } = await extractText(new Uint8Array(buffer))
    const resumeText = (rawText ?? '').slice(0, 6000)

    // Call GPT-4o to parse resume
    const rawJson = await callGPT(
      PROMPTS.RESUME_PARSER,
      `Parse this resume:\n\n${resumeText}`
    )
    const parsed = JSON.parse(rawJson)

    // Delete old skills and save new ones
    await prisma.skillProfile.deleteMany({ where: { userId } })

    type SkillInput = { userId: string; skillName: string; category: string }
    const allSkills: SkillInput[] = [
      ...((parsed.technical_skills as string[]) ?? []).map((s: string) => ({ userId, skillName: s, category: 'technical' })),
      ...((parsed.soft_skills as string[]) ?? []).map((s: string) => ({ userId, skillName: s, category: 'soft' })),
      ...((parsed.tools as string[]) ?? []).map((s: string) => ({ userId, skillName: s, category: 'tool' })),
      ...((parsed.frameworks as string[]) ?? []).map((s: string) => ({ userId, skillName: s, category: 'framework' })),
    ]

    await prisma.skillProfile.createMany({ data: allSkills })

    return ok({ resumeUrl, skillsExtracted: allSkills.length, parsed })
  } catch (err) {
    console.error('[resume/upload]', err)
    return serverError()
  }
}
