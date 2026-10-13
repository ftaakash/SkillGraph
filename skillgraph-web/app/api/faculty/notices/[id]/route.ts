import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, ok, unauthorized, serverError } from '@/lib/api'
import { facultyContext } from '@/lib/tenant'

// DELETE /api/faculty/notices/:id — withdraw a notice (its author or a college admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()
    const { id } = await params
    const notice = await prisma.notice.findFirst({ where: { id, collegeId: ctx.collegeId }, select: { authorId: true } })
    if (!notice) return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
    if (notice.authorId !== userId && !ctx.isCollegeAdmin) return unauthorized()
    await prisma.notice.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (err) {
    console.error('[faculty/notices/:id DELETE]', err)
    return serverError()
  }
}
