export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getUserId, unauthorized, serverError } from '@/lib/api'
import { exportUserData } from '@/lib/dataRights'

// GET /api/users/me/export — machine-readable copy of all data held about the signed-in user
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const data = await exportUserData(userId)
    if (!data) return unauthorized()

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="skillgraph-data-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[users/me/export]', err)
    return serverError()
  }
}
