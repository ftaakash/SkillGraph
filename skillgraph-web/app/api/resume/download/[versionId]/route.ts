import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    const { versionId } = await params;
    const session = await auth()
    if (!session?.user || !session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        OpenClawConfig: true,
        skills: true,
        ResumeVersions: {
          where: { id: versionId },
          take: 1
        }
      }
    });
    
    if (!user || user.ResumeVersions.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const version = user.ResumeVersions[0];

    // Helper to parse complex sections
    const parseText = (text: string) => {
      if (!text) return [];
      return text.split(/\n\n+/).filter(Boolean).map((block) => {
        const lines = block.split('\n').filter(Boolean)
        return {
          role: lines[0] || 'Role',
          company: lines[1] || 'Company',
          location: lines[2]?.includes(',') ? lines[2] : 'Remote',
          duration: lines[3] || '',
          bullets: lines.slice(4),
        }
      })
    }

    const parseTextProjects = (text: string) => {
      if (!text) return []
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

    // Helper to parse experience/projects from section data
    const parseSectionToLines = (content: any): string[] => {
      if (typeof content === 'string') return content.split('\n').filter(Boolean);
      if (Array.isArray(content)) return content.map(String);
      if (content?.text && typeof content.text === 'string') return content.text.split('\n').filter(Boolean);
      return [];
    };

    // Case 1: Local file (served directly from public/resumes)
    if (version.cloudinaryUrl?.startsWith('/resumes/')) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', version.cloudinaryUrl);
        const fileBuffer = await fs.readFile(filePath);
        
        return new NextResponse(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="skillgraph_resume_${versionId.slice(-4)}.pdf"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      } catch (e) {
        console.warn(`[resume/download] Local file not found: ${version.cloudinaryUrl}, falling back to regeneration.`);
      }
    }

    // Case 2: Fallback logic if Cloudinary is mock or missing
    const isMock = !version.cloudinaryUrl || version.cloudinaryUrl.includes('mock-cloudinary.com');

    if (isMock) {
      // Fetch sections for this specific version
      const sections = await prisma.resumeSection.findMany({
        where: { resumeVersionId: version.id }
      });

      const getSectionContent = (type: string) => {
        const s = sections.find(sec => sec.type.toLowerCase() === type.toLowerCase());
        if (!s) return '';
        const content = s.content;
        if (typeof content === 'string') return content;
        if (typeof content === 'object') return (content as any).text || JSON.stringify(content);
        return String(content);
      };

      const { generateResumePDFBuffer } = await import('@/lib/resume/exporter');
      const resumeData = {
        name: user.name || 'Student',
        email: user.email || '',
        tagline: user.targetRole || 'Software Professional',
        phone: user.OpenClawConfig?.phone || '+91 0000000000',
        linkedin: `linkedin.com/in/${user.name?.toLowerCase().replace(/ /g, '-')}`,
        github: `github.com/${user.name?.toLowerCase().replace(/ /g, '')}`,
        summary: getSectionContent('summary') || `Professional ${user.targetRole || 'Engineer'} with expertise in technology.`,
        skills: {
          technical: user.skills.filter(s => s.category === 'technical').map(s => s.skillName),
          tools: user.skills.filter(s => s.category !== 'technical').map(s => s.skillName)
        },
        experience: parseText(getSectionContent('experience')),
        projects: parseTextProjects(getSectionContent('projects')),
        education: [
          { 
            degree: user.branch ? `${user.branch} (${user.year})` : 'Degree Candidate', 
            college: user.college || 'University', 
            cgpa: user.cgpa?.toString() || '—', 
            year: user.year || '2026',
            location: 'India' 
          }
        ],
        achievements: parseSectionToLines(getSectionContent('achievements') || getSectionContent('honor')),
        activities: parseSectionToLines(getSectionContent('activities') || getSectionContent('organization'))
      };

      const pdfBuffer = await generateResumePDFBuffer(resumeData);
      const uint8 = new Uint8Array(pdfBuffer);

      return new NextResponse(uint8, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="skillgraph_resume_${versionId.slice(-4)}.pdf"`,
          'Content-Length': uint8.length.toString(),
        },
      });
    }

    // Case 3: Public Cloudinary URL
    return NextResponse.redirect(version.cloudinaryUrl!)
  } catch (err) {
    console.error('[resume/download GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
