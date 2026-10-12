export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError } from '@/lib/api'
import { getFileAccess, fileResponse } from '@/lib/storage'

// GET /api/resume/file — the signed-in user's own uploaded résumé (short-lived signed URL)
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { resumeUrl: true } })
    const access = user?.resumeUrl ? await getFileAccess(user.resumeUrl) : null
    if (!access) return NextResponse.json({ error: 'No resume on file' }, { status: 404 })

    return fileResponse(access, 'resume.pdf')
  } catch (err) {
    console.error('[resume/file GET]', err)
    return serverError()
  }
}
