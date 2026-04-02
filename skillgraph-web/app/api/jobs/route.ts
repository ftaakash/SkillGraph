import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { role?: string }
    if (user.role !== 'STUDENT') return unauthorized()

    const jobs = await prisma.facultyJobPosting.findMany({
      where: { deadline: { gte: new Date() } },
      orderBy: { deadline: 'asc' },
    })
    return ok({ jobs })
  } catch (err) {
    console.error('[jobs GET]', err)
    return serverError()
  }
}
