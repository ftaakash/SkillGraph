import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, serverError } from '@/lib/api'

// GET /api/talent-requests — recruiters who asked the signed-in student to reveal their identity
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const views = await prisma.recruiterTalentView.findMany({
      where: { studentId: userId, revealStatus: { in: ['requested', 'accepted', 'declined'] } },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    })
    const recruiters = await prisma.user.findMany({
      where: { id: { in: views.map(v => v.recruiterId) } },
      select: { id: true, Company: { select: { name: true, website: true } } },
    })
    const byId = new Map(recruiters.map(r => [r.id, r]))

    return ok({
      requests: views.map(v => ({
        id: v.id,
        status: v.revealStatus,
        requestedAt: v.requestedAt,
        respondedAt: v.respondedAt,
        company: byId.get(v.recruiterId)?.Company?.name ?? 'A recruiter',
        companyWebsite: byId.get(v.recruiterId)?.Company?.website ?? null,
      })),
    })
  } catch (err) {
    console.error('[talent-requests GET]', err)
    return serverError()
  }
}
