import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { extractStories, getStories } from '@/lib/openclaw/storybank'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const stories = await getStories(session.user.id as string)
    return ok({ stories })
  } catch (err) {
    console.error('[openclaw/stories GET]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const { role, company } = await req.json()

    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { select: { skillName: true } } },
    })

    await extractStories(
      userId,
      role ?? student?.targetRole ?? 'Software Engineer',
      company ?? 'your target company',
      '',
      student?.skills.map(s => s.skillName) ?? []
    )

    const stories = await getStories(userId)
    return ok({ stories })
  } catch (err) {
    console.error('[openclaw/stories POST]', err)
    return serverError()
  }
}
