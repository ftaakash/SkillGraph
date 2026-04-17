import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const { status } = await req.json()
    if (!status) return badRequest('status is required')

    const resolvedParams = await params
    const id = resolvedParams.id

    const existing = await prisma.openClawApplication.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 })
    }

    const updated = await prisma.openClawApplication.update({
      where: { id },
      data: { status },
    })

    return ok({ application: updated })
  } catch (err) {
    console.error('[openclaw/applications/patch]', err)
    return serverError()
  }
}
