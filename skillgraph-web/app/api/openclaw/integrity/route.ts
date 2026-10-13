import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError } from '@/lib/api'
import { requireCronSecret } from '@/lib/cron'
import { OPEN_STATUSES } from '@/lib/openclaw/status'

// POST /api/openclaw/integrity — daily dedup cron
export async function POST(req: NextRequest) {
  try {
    const denied = requireCronSecret(req)
    if (denied) return denied

    // All open applications with their listing's company and role, in one query
    const apps = await prisma.openClawApplication.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      orderBy: { appliedAt: 'asc' }, // keep the earliest entry, mark later ones as duplicates
      select: { id: true, userId: true, listing: { select: { company: true, role: true } } },
    })

    const seen = new Map<string, string>()
    const toMarkDup: string[] = []

    for (const app of apps) {
      const { listing } = app
      const key = `${app.userId}::${listing.company.toLowerCase()}::${listing.role.toLowerCase()}`
      if (seen.has(key)) {
        toMarkDup.push(app.id)
      } else {
        seen.set(key, app.id)
      }
    }

    if (toMarkDup.length > 0) {
      await prisma.openClawApplication.updateMany({
        where: { id: { in: toMarkDup } },
        data: { status: 'Duplicate' },
      })
    }

    return ok({ deduped: toMarkDup.length, total: apps.length })
  } catch (err) {
    console.error('[openclaw/integrity]', err)
    return serverError()
  }
}
