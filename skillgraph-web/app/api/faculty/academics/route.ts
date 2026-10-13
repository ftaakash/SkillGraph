export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getUserId, unauthorized, ok, serverError } from '@/lib/api'
import { facultyContext, collegeStudents } from '@/lib/tenant'
import { attendanceStatus, overallAttendance, DEFAULT_THRESHOLD } from '@/lib/academics/calc'

// GET /api/faculty/academics — attendance risk across the faculty member's own college
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()
    const ctx = await facultyContext(userId)
    if (!ctx) return unauthorized()

    const [students, calendarDays] = await Promise.all([
      prisma.user.findMany({
        where: collegeStudents(ctx.collegeId),
        select: {
          id: true, name: true, email: true, branch: true, year: true,
          AcademicCourses: { select: { code: true, title: true, category: true, attended: true, conducted: true } },
          AcademicConnection: { select: { status: true, lastSyncAt: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.collegeCalendarDay.count({ where: { collegeId: ctx.collegeId } }),
    ])

    const rows = students.map(s => {
      const overall = overallAttendance(s.AcademicCourses)
      const atRisk = s.AcademicCourses
        .filter(c => c.conducted > 0 && !attendanceStatus(c.attended, c.conducted).safe)
        .map(c => ({ code: c.code, title: c.title, category: c.category, ...attendanceStatus(c.attended, c.conducted) }))
      return {
        id: s.id, name: s.name, email: s.email, branch: s.branch, year: s.year,
        courses: s.AcademicCourses.length,
        overallPercent: overall.conducted ? overall.percent : null,
        atRisk,
        connection: s.AcademicConnection,
      }
    })

    return ok({
      threshold: DEFAULT_THRESHOLD,
      calendarDays,
      totals: {
        students: rows.length,
        withRecords: rows.filter(r => r.courses > 0).length,
        atRisk: rows.filter(r => r.atRisk.length > 0).length,
        connected: rows.filter(r => r.connection?.status === 'active').length,
      },
      students: rows,
    })
  } catch (err) {
    console.error('[faculty/academics GET]', err)
    return serverError()
  }
}
