export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/health — public liveness/readiness probe for uptime monitors and load balancers.
// Deliberately returns no configuration or version details.
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'ok', latencyMs: Date.now() - startedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[health] database check failed', err)
    return NextResponse.json(
      { status: 'degraded', db: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
