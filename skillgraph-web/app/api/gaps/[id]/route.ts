import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, badRequest, serverError, ok } from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const { closed } = body

    const gap = await prisma.skillGap.findUnique({ where: { id } })
    if (!gap || gap.userId !== session.user.id) return badRequest('Gap not found')

    const updated = await prisma.skillGap.update({
      where: { id },
      data: { closed: closed ?? true },
    })

    return ok({ gap: updated })
  } catch (err) {
    console.error('[gaps/[id] PATCH]', err)
    return serverError()
  }
}
