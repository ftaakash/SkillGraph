import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { facultyContext } from '@/lib/tenant'
import { CsvError, MAX_IMPORT_BYTES } from '@/lib/academics/csv'
import { ImportError, parseDrivesCsv, applyDrivesImport, DRIVES_TEMPLATE } from '@/lib/academics/imports'
import { logger } from '@/lib/log'

const bodySchema = z.object({ csv: z.string().min(1).max(MAX_IMPORT_BYTES), dryRun: z.boolean().default(true) })

// GET /api/faculty/jobs/import — the placement-drive CSV template
export async function GET() {
  const userId = await getUserId()
  if (!userId || !(await facultyContext(userId))) return unauthorized()
  return new NextResponse(DRIVES_TEMPLATE, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="skillgraph-drives-template.csv"' },
  })
}

// POST /api/faculty/jobs/import — create or update placement drives from a portal export (e.g. Haveloc)
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('Upload a CSV file (up to 2 MB)')
    const { rows, errors } = parseDrivesCsv(parsed.data.csv)
    const result = await applyDrivesImport(ctx.collegeId, rows, parsed.data.dryRun)
    if (!parsed.data.dryRun) logger.info('jobs.drives_imported', { userId, collegeId: ctx.collegeId, ...result })
    return ok({ dryRun: parsed.data.dryRun, rows: rows.length, errors: errors.slice(0, 50), errorCount: errors.length, ...result })
  } catch (err) {
    if (err instanceof CsvError || err instanceof ImportError) return badRequest(err.message)
    console.error('[faculty/jobs/import POST]', err)
    return serverError()
  }
}
