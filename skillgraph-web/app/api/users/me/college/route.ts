import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { joinCollege, leaveCollege } from '@/lib/tenant'

async function studentId() {
  const userId = await getUserId()
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'STUDENT' ? userId : null
}

const bodySchema = z.object({ code: z.string().trim().min(4).max(32) })

// POST /api/users/me/college — join the college workspace with the code from your placement cell
export async function POST(req: NextRequest) {
  try {
    const id = await studentId()
    if (!id) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('Enter the join code from your placement cell')

    const college = await joinCollege(id, parsed.data.code)
    if (!college) return badRequest('That join code is not valid. Check it with your placement cell.')
    return ok({ college })
  } catch (err) {
    console.error('[users/me/college POST]', err)
    return serverError()
  }
}

// DELETE /api/users/me/college — leave the college workspace (faculty stop seeing your data)
export async function DELETE() {
  try {
    const id = await studentId()
    if (!id) return unauthorized()
    await leaveCollege(id)
    return ok({ left: true })
  } catch (err) {
    console.error('[users/me/college DELETE]', err)
    return serverError()
  }
}
