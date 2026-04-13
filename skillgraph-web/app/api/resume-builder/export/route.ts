import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateResumePDFBuffer } from '@/lib/resume/exporter'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { sections, name, email } = body

    // Build a resume data object from the flat sections the builder uses
    const resumeData = {
      name: name || session.user.name || 'Student',
      email: email || session.user.email || '',
      summary: sections?.summary || '',
      skills: {
        technical: (sections?.skills || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        tools: [],
      },
      experience: parseExperienceText(sections?.experience || ''),
      projects: parseProjectsText(sections?.projects || ''),
      education: parseEducationText(sections?.education || ''),
      certifications: (sections?.certifications || '')
        .split('\n')
        .map((c: string) => c.trim())
        .filter(Boolean),
    }

    const pdfBuffer = await generateResumePDFBuffer(resumeData)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="skillgraph_resume.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('[resume-builder/export POST]', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}

// Simple text parsers — the builder stores sections as plain text
function parseExperienceText(text: string) {
  if (!text.trim()) return []
  // Each block separated by double newline
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').filter(Boolean)
      return {
        role: lines[0] || 'Role',
        company: lines[1] || 'Company',
        duration: lines[2] || '',
        bullets: lines.slice(3),
      }
    })
}

function parseProjectsText(text: string) {
  if (!text.trim()) return []
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').filter(Boolean)
      return {
        name: lines[0] || 'Project',
        techStack: (lines[1] || '').split(',').map((t: string) => t.trim()),
        impact: lines[2] || '',
        bullets: lines.slice(3),
      }
    })
}

function parseEducationText(text: string) {
  if (!text.trim()) return undefined
  const lines = text.split('\n').filter(Boolean)
  return {
    degree: lines[0] || '',
    college: lines[1] || '',
    cgpa: lines[2] || '',
    year: lines[3] || '',
  }
}
