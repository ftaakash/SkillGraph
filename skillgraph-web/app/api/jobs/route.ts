import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { studentCollegeId } from '@/lib/tenant'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string; role?: string }
    if (user.role !== 'STUDENT' || !user.id) return unauthorized()

    // Campus jobs come from the college the student has joined (read fresh, not from the session)
    const collegeId = await studentCollegeId(user.id)
    if (!collegeId) return ok({ jobs: [], joinedCollege: false })

    const jobs = await prisma.facultyJobPosting.findMany({
      where: { 
        collegeId,
        deadline: { gte: new Date() } 
      },
      orderBy: { deadline: 'asc' },
    })
    return ok({ jobs, joinedCollege: true })
  } catch (err) {
    console.error('[jobs GET]', err)
    return serverError()
  }
}
