import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api'

const MAX_LEAVES = 120
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const leaveSchema = z.object({ date: dateSchema, kind: z.enum(['OD', 'ML']) })

async function studentId() {
  const user = (await auth())?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'STUDENT' ? user.id : null
}

// POST /api/academics/leaves — mark a date as on-duty (OD) or medical leave (ML)
export async function POST(req: NextRequest) {
  try {
    const userId = await studentId()
    if (!userId) return unauthorized()
    const parsed = leaveSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('date (YYYY-MM-DD) and kind (OD or ML) are required')
    const date = new Date(`${parsed.data.date}T00:00:00Z`)
    if (Number.isNaN(date.getTime())) return badRequest('Invalid date')

    const count = await prisma.attendanceLeave.count({ where: { userId } })
    if (count >= MAX_LEAVES) return badRequest(`You can save up to ${MAX_LEAVES} OD/ML days`)

    await prisma.attendanceLeave.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, kind: parsed.data.kind },
      update: { kind: parsed.data.kind },
    })
    return ok({ saved: true })
  } catch (err) {
    console.error('[academics/leaves POST]', err)
    return serverError()
  }
}

// DELETE /api/academics/leaves?date=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  try {
    const userId = await studentId()
    if (!userId) return unauthorized()
    const parsed = dateSchema.safeParse(req.nextUrl.searchParams.get('date'))
    if (!parsed.success) return badRequest('date (YYYY-MM-DD) is required')
    await prisma.attendanceLeave.deleteMany({ where: { userId, date: new Date(`${parsed.data}T00:00:00Z`) } })
    return ok({ removed: true })
  } catch (err) {
    console.error('[academics/leaves DELETE]', err)
    return serverError()
  }
}
