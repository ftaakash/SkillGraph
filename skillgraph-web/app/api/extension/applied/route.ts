import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, badRequest, serverError } from '@/lib/api'
import { extensionStudent } from '@/lib/extension'

const bodySchema = z.object({ applicationId: z.string().min(1).max(40) })

// POST /api/extension/applied — the student submitted the form on the job site; track it as Applied
export async function POST(req: NextRequest) {
  try {
    const auth = await extensionStudent(req)
    if ('error' in auth) return auth.error
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('applicationId is required')

    const { count } = await prisma.openClawApplication.updateMany({
      where: { id: parsed.data.applicationId, userId: auth.userId, status: { in: ['Pending', 'ReadyToApply'] } },
      data: { status: 'Applied', submittedVia: 'extension', appliedAt: new Date() },
    })
    if (count === 0) {
      const exists = await prisma.openClawApplication.findFirst({ where: { id: parsed.data.applicationId, userId: auth.userId }, select: { status: true } })
      if (!exists) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      return ok({ status: exists.status, unchanged: true })
    }
    return ok({ status: 'Applied' })
  } catch (err) {
    console.error('[extension/applied]', err)
    return serverError()
  }
}
