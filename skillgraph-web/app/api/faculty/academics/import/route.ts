import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserId, unauthorized, ok, badRequest, serverError } from '@/lib/api'
import { facultyContext } from '@/lib/tenant'
import { CsvError, MAX_IMPORT_BYTES } from '@/lib/academics/csv'
import {
  ImportError, parseRecordsCsv, applyRecordsImport, parseCalendarCsv, applyCalendarImport,
  RECORDS_TEMPLATE, CALENDAR_TEMPLATE,
} from '@/lib/academics/imports'
import { logger } from '@/lib/log'

const bodySchema = z.object({
  kind: z.enum(['records', 'calendar']),
  csv: z.string().min(1).max(MAX_IMPORT_BYTES),
  dryRun: z.boolean().default(true),
})

// GET /api/faculty/academics/import?template=records|calendar — a CSV template to fill in
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId || !(await facultyContext(userId))) return unauthorized()
  const kind = req.nextUrl.searchParams.get('template') === 'calendar' ? 'calendar' : 'records'
  return new NextResponse(kind === 'calendar' ? CALENDAR_TEMPLATE : RECORDS_TEMPLATE, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="skillgraph-${kind}-template.csv"` },
  })
}

// POST /api/faculty/academics/import — attendance/marks records or the academic calendar, for the faculty member's college only
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return badRequest('Upload a CSV file (up to 2 MB)')
    const { kind, csv, dryRun } = parsed.data

    if (kind === 'records') {
      const { rows, errors } = parseRecordsCsv(csv)
      const result = await applyRecordsImport(ctx.collegeId, rows, dryRun)
      if (!dryRun) logger.info('academics.records_imported', { userId, collegeId: ctx.collegeId, courses: result.courses })
      return ok({ kind, dryRun, rows: rows.length, errors: errors.slice(0, 50), errorCount: errors.length, ...result })
    }
    const { days, errors } = parseCalendarCsv(csv)
    const result = await applyCalendarImport(ctx.collegeId, days, dryRun)
    if (!dryRun) logger.info('academics.calendar_imported', { userId, collegeId: ctx.collegeId, days: result.days })
    return ok({ kind, dryRun, rows: days.length, errors: errors.slice(0, 50), errorCount: errors.length, ...result })
  } catch (err) {
    if (err instanceof CsvError || err instanceof ImportError) return badRequest(err.message)
    console.error('[faculty/academics/import POST]', err)
    return serverError()
  }
}
