import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getUserId, unauthorized, ok, badRequest, serverError, academicFailure } from '@/lib/api'
import { connectAcademics, disconnectAcademics } from '@/lib/academics/sync'
import { PROVIDER_IDS } from '@/lib/academics/types'
import { logger } from '@/lib/log'

const connectSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  login: z.string().trim().max(200).optional(),
  // Used once to open a portal session; never stored or logged
  password: z.string().max(200).optional(),
  consent: z.literal(true, { message: 'Please agree to let SkillGraph read your academic record' }),
})

// POST /api/academics/connect — link the student's university record and run the first sync
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const parsed = connectSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request')

    const { provider, login, password } = parsed.data
    await connectAcademics(userId, provider, { login, password })
    logger.info('academics.connected', { userId, provider })
    return ok({ connected: true })
  } catch (err) {
    return academicFailure(err) ?? (console.error('[academics/connect POST]', err), serverError())
  }
}

// DELETE /api/academics/connect?deleteData=1 — unlink, optionally removing synced data too
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const deleteData = req.nextUrl.searchParams.get('deleteData') === '1'
    await disconnectAcademics(userId, { deleteData })
    logger.info('academics.disconnected', { userId, deleteData })
    return ok({ connected: false })
  } catch (err) {
    console.error('[academics/connect DELETE]', err)
    return serverError()
  }
}
