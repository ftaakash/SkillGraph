import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'
import { USER_SETTABLE_STATUSES } from '@/lib/openclaw/status'

const bodySchema = z.object({ status: z.enum(USER_SETTABLE_STATUSES) })

// PATCH /api/openclaw/applications/:id — the student reports progress on their own application
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(`status must be one of: ${USER_SETTABLE_STATUSES.join(', ')}`)

    const { id } = await params
    const existing = await prisma.openClawApplication.findUnique({ where: { id }, select: { userId: true } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const updated = await prisma.openClawApplication.update({
      where: { id },
      data: {
        status: parsed.data.status,
        // appliedAt marks when the student actually applied
        ...(parsed.data.status === 'Applied' ? { appliedAt: new Date() } : {}),
      },
    })
    return ok({ application: updated })
  } catch (err) {
    console.error('[openclaw/applications PATCH]', err)
    return serverError()
  }
}
