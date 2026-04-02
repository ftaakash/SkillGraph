import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — list user's saved resume versions
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const versions = await prisma.resumeVersion.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ versions })
}

// POST — save a new resume version
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { targetJd, atsScore, sections } = body

  const version = await prisma.resumeVersion.create({
    data: {
      userId: session.user.id,
      targetJd: targetJd || null,
      atsScore: atsScore || null,
      generatedBy: 'Manual',
    },
  })

  // Save sections if provided
  if (sections && typeof sections === 'object') {
    const sectionEntries = Object.entries(sections).filter(([, v]) => v && String(v).trim().length > 0)
    if (sectionEntries.length > 0) {
      await prisma.resumeSection.createMany({
        data: sectionEntries.map(([type, content]) => ({
          resumeVersionId: version.id,
          type: type.charAt(0).toUpperCase() + type.slice(1),
          content: typeof content === 'string' ? { text: content } : content as any,
          atsContribution: null,
        })),
      })
    }
  }

  return NextResponse.json({ version }, { status: 201 })
}
