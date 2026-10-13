export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'

const PAGE = 50

/** The college whose notice board this user reads: a joined student's or a faculty member's own. */
async function noticeCollege(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, collegeId: true } })
  return user && (user.role === 'STUDENT' || user.role === 'FACULTY') ? user.collegeId : null
}

// GET /api/notices?q=&category=&job=&before=ISO — the college notice board, newest first, with read state
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const collegeId = await noticeCollege(userId)
    if (!collegeId) return ok({ notices: [], unread: 0, joinedCollege: false })

    const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 100)
    const category = req.nextUrl.searchParams.get('category')
    const job = req.nextUrl.searchParams.get('job')
    const before = new Date(req.nextUrl.searchParams.get('before') ?? '')
    const where = {
      collegeId,
      ...(category ? { category } : {}),
      ...(job ? { jobPostingId: job } : {}),
      ...(Number.isNaN(before.getTime()) ? {} : { createdAt: { lt: before } }),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { body: { contains: q, mode: 'insensitive' as const } }] } : {}),
    }
    const [notices, unread] = await Promise.all([
      prisma.notice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: PAGE,
        include: {
          author: { select: { name: true } },
          jobPosting: { select: { id: true, title: true, company: true } },
          reads: { where: { userId }, select: { readAt: true } },
        },
      }),
      prisma.notice.count({ where: { collegeId, reads: { none: { userId } } } }),
    ])
    return ok({
      joinedCollege: true,
      unread,
      hasMore: notices.length === PAGE,
      notices: notices.map(({ reads, ...n }) => ({ ...n, read: reads.length > 0 })),
    })
  } catch (err) {
    console.error('[notices GET]', err)
    return serverError()
  }
}

const readSchema = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(200) })

// POST /api/notices — mark notices as read
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const parsed = readSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('ids are required')
    const collegeId = await noticeCollege(userId)
    if (!collegeId) return unauthorized()

    // Only notices on the user's own board
    const notices = await prisma.notice.findMany({ where: { id: { in: parsed.data.ids }, collegeId }, select: { id: true } })
    await prisma.noticeRead.createMany({ data: notices.map(n => ({ noticeId: n.id, userId })), skipDuplicates: true })
    return ok({ read: notices.length })
  } catch (err) {
    console.error('[notices POST]', err)
    return serverError()
  }
}
