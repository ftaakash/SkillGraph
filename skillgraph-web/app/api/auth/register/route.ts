import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ok, created, badRequest, serverError } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STUDENT']).optional().default('STUDENT'),
  college: z.string().optional(),
  branch: z.string().optional(),
  year: z.string().optional(),
  targetRole: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.message)

    const { name, email, password, role, college, branch, year, targetRole } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return badRequest('Email already registered')

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, college, branch, year, targetRole },
      select: { id: true, name: true, email: true, targetRole: true },
    })

    return created({ user })
  } catch (err) {
    console.error('[register]', err)
    return serverError()
  }
}
