export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { driveAccess } from '@/lib/placement'

const PAGE = 100
const notFound = () => NextResponse.json({ error: 'Chat not found' }, { status: 404 })

const messageInclude = { user: { select: { id: true, name: true, role: true } } } as const

function present(
  m: { id: string; body: string; replyToId: string | null; deletedAt: Date | null; createdAt: Date; user: { id: string; name: string; role: string } },
  viewerId: string,
) {
  return {
    id: m.id,
    body: m.deletedAt ? null : m.body,
    deleted: Boolean(m.deletedAt),
    replyToId: m.replyToId,
    createdAt: m.createdAt,
    mine: m.user.id === viewerId,
    author: { name: m.user.name, isFaculty: m.user.role === 'FACULTY' },
  }
}

// GET /api/drives/:id/messages?after=ISO — the drive's group chat (polling: pass the newest createdAt you have)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const access = await driveAccess(userId, id)
    if (!access) return notFound()

    const after = new Date(req.nextUrl.searchParams.get('after') ?? '')
    const incremental = !Number.isNaN(after.getTime())
    const rows = await prisma.driveMessage.findMany({
      where: { jobPostingId: id, ...(incremental ? { createdAt: { gt: after } } : {}) },
      include: messageInclude,
      // First load: the latest page; polling: everything new, oldest first
      orderBy: { createdAt: incremental ? 'asc' : 'desc' },
      take: PAGE,
    })
    const messages = (incremental ? rows : rows.reverse()).map(m => present(m, userId))
    const job = incremental ? null : await prisma.facultyJobPosting.findUnique({ where: { id }, select: { title: true, company: true } })
    return ok({ messages, job, canModerate: access.role === 'faculty' })
  } catch (err) {
    console.error('[drives/:id/messages GET]', err)
    return serverError()
  }
}

const postSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(1000, 'Messages are limited to 1000 characters'),
  replyToId: z.string().min(1).max(40).optional(),
})

// POST /api/drives/:id/messages — post to the drive chat
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const access = await driveAccess(userId, id)
    if (!access) return notFound()

    const parsed = postSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid message')
    const { body, replyToId } = parsed.data
    if (replyToId) {
      const parent = await prisma.driveMessage.findFirst({ where: { id: replyToId, jobPostingId: id }, select: { id: true } })
      if (!parent) return badRequest('The message you replied to no longer exists')
    }
    const message = await prisma.driveMessage.create({
      data: { jobPostingId: id, userId, body, replyToId },
      include: messageInclude,
    })
    return ok({ message: present(message, userId) })
  } catch (err) {
    console.error('[drives/:id/messages POST]', err)
    return serverError()
  }
}

// DELETE /api/drives/:id/messages?messageId= — authors remove their own messages; faculty moderate any
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const { id } = await params
    const access = await driveAccess(userId, id)
    if (!access) return notFound()

    const messageId = req.nextUrl.searchParams.get('messageId') ?? ''
    const message = await prisma.driveMessage.findFirst({ where: { id: messageId, jobPostingId: id }, select: { userId: true } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    if (message.userId !== userId && access.role !== 'faculty') return unauthorized()
    await prisma.driveMessage.update({ where: { id: messageId }, data: { deletedAt: new Date(), body: '' } })
    return ok({ deleted: true })
  } catch (err) {
    console.error('[drives/:id/messages DELETE]', err)
    return serverError()
  }
}
