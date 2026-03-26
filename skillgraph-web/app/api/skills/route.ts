import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, serverError, ok } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const skills = await prisma.skillProfile.findMany({
      where: { userId: userId },
      orderBy: { extractedAt: 'desc' },
    })

    return ok({ skills })
  } catch (err) {
    console.error('[skills GET]', err)
    return serverError()
  }
}
