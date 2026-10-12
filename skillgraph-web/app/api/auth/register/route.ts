import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { created, badRequest, serverError } from '@/lib/api'
import { studentRegisterSchema, firstIssue } from '@/lib/validation/auth'
import { emailInUse, consentFields, sendVerification } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = studentRegisterSchema.safeParse(body)
    if (!parsed.success) return badRequest(firstIssue(parsed.error))

    const { name, email, password, role, college, branch, year, targetRole } = parsed.data

    if (await emailInUse(email)) return badRequest('Email already registered')

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, college, branch, year, targetRole, ...consentFields() },
      select: { id: true, name: true, email: true, targetRole: true },
    })
    await sendVerification(user)

    return created({ user })
  } catch (err) {
    console.error('[register]', err)
    return serverError()
  }
}
