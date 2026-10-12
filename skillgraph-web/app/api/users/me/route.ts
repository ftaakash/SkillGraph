import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok, badRequest } from '@/lib/api'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { invalidateSessions } from '@/lib/accounts'
import { deleteUserAccount } from '@/lib/dataRights'
import { passwordSchema, firstIssue } from '@/lib/validation/auth'

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  college: z.string().trim().max(200).optional(),
  branch: z.string().trim().max(200).optional(),
  year: z.string().trim().max(50).optional(),
  targetRole: z.string().trim().max(200).optional(),
  // Changing the password requires the current one
  password: passwordSchema.optional(),
  currentPassword: z.string().max(128).optional(),
  isProfileVisible: z.boolean().optional(),
  cgpa: z.number().min(0).max(10).optional(),
  linkedin: z.string().url().max(300).optional().or(z.literal('')),
  github: z.string().url().max(300).optional().or(z.literal('')),
}).refine(d => !d.password || d.currentPassword, { message: 'Enter your current password to set a new one', path: ['currentPassword'] })

const PROFILE_SELECT = {
  id: true, name: true, email: true, role: true, college: true, branch: true,
  year: true, targetRole: true, readinessScore: true, resumeUrl: true,
  sprintsCompleted: true, optimizerSessions: true, createdAt: true,
  isProfileVisible: true, cgpa: true, linkedin: true, github: true, emailVerifiedAt: true,
  collegeId: true, College: { select: { name: true, city: true } },
} as const

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT })
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

    const parsed = updateSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstIssue(parsed.error))

    const { password, currentPassword, ...profile } = parsed.data
    let passwordHash: string | undefined

    if (password) {
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
      if (!current || !(await bcrypt.compare(currentPassword ?? '', current.passwordHash))) {
        return badRequest('Current password is incorrect')
      }
      passwordHash = await bcrypt.hash(password, 12)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...profile, ...(passwordHash ? { passwordHash } : {}) },
      select: PROFILE_SELECT,
    })

    // A password change signs out every session, including this one
    if (passwordHash) await invalidateSessions(userId)

    return ok({ user: updated, signedOut: Boolean(passwordHash) })
  } catch (err) {
    console.error('[users/me PATCH]', err)
    return serverError()
  }
}

const deleteSchema = z.object({ password: z.string().min(1).max(128), confirm: z.literal('DELETE') })

// DELETE /api/users/me — permanently erase the account (right to erasure)
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return badRequest('Type DELETE and enter your password to confirm')

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return badRequest('Password is incorrect')
    }

    await deleteUserAccount(userId)
    return ok({ deleted: true })
  } catch (err) {
    console.error('[users/me DELETE]', err)
    return serverError()
  }
}
