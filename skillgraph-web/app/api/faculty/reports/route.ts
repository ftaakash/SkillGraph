import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string; collegeId?: string }
    if (user.role !== 'FACULTY') return unauthorized()

    const records = await prisma.placementRecord.findMany({
      where: { collegeId: user.collegeId || '' },
      orderBy: { offerDate: 'desc' },
    })
    return ok({ records })
  } catch (err) {
    console.error('[faculty/reports GET]', err)
    return serverError()
  }
}
