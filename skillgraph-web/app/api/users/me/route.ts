import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateSchema = z.object({
  name: z.string().optional(),
  college: z.string().optional(),
  branch: z.string().optional(),
  year: z.string().optional(),
  targetRole: z.string().optional(),
  password: z.string().min(6).optional(),
  isProfileVisible: z.boolean().optional(),
  cgpa: z.number().min(0).max(10).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, college: true, branch: true,
        year: true, targetRole: true, readinessScore: true, resumeUrl: true,
        sprintsCompleted: true, optimizerSessions: true, createdAt: true,
        isProfileVisible: true, cgpa: true,
      },
    })

    return ok({ user })
  } catch (err) {
    console.error('[users/me GET]', err)
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.message)

    const { password, ...restData } = parsed.data
    const updateData: any = { ...restData }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, name: true, email: true, college: true, branch: true,
        year: true, targetRole: true, readinessScore: true, isProfileVisible: true, cgpa: true,
      },
    })

    return ok({ user: updated })
  } catch (err) {
    console.error('[users/me PATCH]', err)
    return serverError()
  }
}
