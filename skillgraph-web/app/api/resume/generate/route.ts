import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateResumePDFBuffer } from '@/lib/resume/exporter'
import { putPrivateFile } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { sections, name, email, targetJd, atsScore } = body

    const userProfile = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      include: { OpenClawConfig: true }
    });

    const resumeData = {
      name: name || userProfile?.name || 'Student',
      email: email || userProfile?.email || '',
      tagline: userProfile?.targetRole || 'Software Professional',
      phone: userProfile?.OpenClawConfig?.phone || '+91 0000000000',
      linkedin: `linkedin.com/in/${(name || userProfile?.name)?.toLowerCase().replace(/ /g, '-')}`,
      github: `github.com/${(name || userProfile?.name)?.toLowerCase().replace(/ /g, '')}`,
      summary: sections?.summary || `Motivated professional with expertise in technology.`,
      skills: {
        technical: (sections?.skills || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        tools: [],
      },
      experience: parseExperienceText(sections?.experience || ''),
      projects: parseProjectsText(sections?.projects || ''),
      education: [
        { 
          degree: userProfile?.branch ? `${userProfile.branch} (${userProfile.year})` : 'Degree Candidate', 
          college: userProfile?.college || 'University', 
          cgpa: userProfile?.cgpa?.toString() || '—', 
          year: userProfile?.year || '2026',
          location: 'India' 
        }
      ],
      achievements: (sections?.achievements || '').split('\n').filter(Boolean),
      activities: (sections?.activities || '').split('\n').filter(Boolean),
    }

    const pdfBuffer = await generateResumePDFBuffer(resumeData)

    // Best-effort private copy; downloads regenerate from sections if this is missing
    let cloudinaryUrl: string | null = null
    try {
      cloudinaryUrl = await putPrivateFile('resumes', `cv_${Date.now()}.pdf`, new Uint8Array(pdfBuffer))
    } catch (e) {
      console.error('[resume/generate] private storage upload failed:', e)
    }

    const version = await prisma.resumeVersion.create({
      data: {
        userId: session.user.id as string,
        targetJd: targetJd || '',
        atsScore: atsScore || 0,
        cloudinaryUrl,
        generatedBy: 'AI',
      }
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="skillgraph_resume.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'X-Resume-Version-Id': version.id,
      },
    })
  } catch (err) {
    console.error('[resume/generate POST]', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}

function parseExperienceText(text: string) {
  if (!text.trim()) return []
  return text.split(/\n\n+/).filter(Boolean).map((block) => {
    const lines = block.split('\n').filter(Boolean)
    return {
      role: lines[0] || 'Role',
      company: lines[1] || 'Company',
      location: lines[2]?.includes(',') ? lines[2] : 'Remote',
      duration: lines[3] || lines[2] || '',
      bullets: lines.slice(4).length > 0 ? lines.slice(4) : lines.slice(3),
    }
  })
}

function parseProjectsText(text: string) {
  if (!text.trim()) return []
  return text.split(/\n\n+/).filter(Boolean).map((block) => {
    const lines = block.split('\n').filter(Boolean)
    return {
      name: lines[0] || 'Project',
      techStack: (lines[1] || '').split(',').map((t: string) => t.trim()),
      date: lines[2] || '',
      bullets: lines.slice(3),
    }
  })
}
