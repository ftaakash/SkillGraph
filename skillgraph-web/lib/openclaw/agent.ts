import { PrismaClient } from '@prisma/client';
import { scrapeNaukri, scrapeLinkedIn, scrapeGlassdoor, scrapeIndeed } from './scraper';
import { scoreJobMatch } from './matcher';
import { applyToJob } from './applicator';
import { generateResumePDFBuffer } from '@/lib/resume/exporter';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
export async function processOpenClawAgent(userId: string) {
  const prisma = new PrismaClient();
  // 1. Fetch Student Config with profile data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      OpenClawConfig: true, 
      skills: true,
      ResumeVersions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!user || !user.OpenClawConfig || !user.OpenClawConfig.isActive) {
    console.log(`OpenClaw is inactive or undefined for user ${userId}.`);
    return;
  }

  // Fetch all existing resume sections for the user to populate the dynamic resume
  const sections = await prisma.resumeSection.findMany({
    where: { 
      resumeVersionId: user.ResumeVersions[0]?.id || 'never'
    }
  });

  const getSectionContent = (type: string) => {
    const s = sections.find(sec => sec.type.toLowerCase() === type.toLowerCase());
    if (!s) return null;
    return s.content;
  };

  // Helper to parse experience/projects from section data
  const parseSectionToLines = (content: any): string[] => {
    if (typeof content === 'string') return content.split('\n').filter(Boolean);
    if (Array.isArray(content)) return content.map(String);
    if (content?.text && typeof content.text === 'string') return content.text.split('\n').filter(Boolean);
    return [];
  };

  const config = user.OpenClawConfig;
  console.log(`Running OpenClaw for ${user.email}... Target Roles:`, config.targetRoles);

  const roles = Array.isArray(config.targetRoles) && config.targetRoles.length > 0 ? (config.targetRoles as string[]) : ['Software Engineer'];
  const cities = Array.isArray(config.preferredCities) && config.preferredCities.length > 0 ? (config.preferredCities as string[]) : ['Remote'];
  
  const platforms = [scrapeNaukri, scrapeLinkedIn, scrapeGlassdoor, scrapeIndeed];
  
  const allListings: any[] = [];
  const activeCity = cities[Math.floor(Math.random() * cities.length)];

  for (const r of roles) {
    for (const scraper of platforms) {
      if (allListings.length >= Math.max(config.dailyLimit * 2, 20)) break; 
      try {
        console.log(`[OpenClaw] Scraper: ${scraper.name} starting for role: ${r}...`);
        const l = await scraper(r, activeCity);
        console.log(`[OpenClaw] Scraper: ${scraper.name} extracted ${l.length} potentials.`);
        allListings.push(...l);
      } catch(e: any) {
        console.error(`[OpenClaw] Scraper: ${scraper.name} failed:`, e?.message || e);
      }
    }
  }

  console.log(`[OpenClaw] Indexing Complete. Processing ${allListings.length} total listings for user ${user.id}.`);

  let appliedCount = 0;

  // 3. Match and Apply
  for (const listing of allListings) {
    if (appliedCount >= config.dailyLimit) break;

    // Duplication Check: Has this user already applied to this specific URL?
    const existingListings = await prisma.openClawListing.findMany({
      where: { sourceUrl: listing.url },
      select: { id: true }
    });
    
    if (existingListings.length > 0) {
      const existingApp = await prisma.openClawApplication.findFirst({
        where: {
          userId: user.id,
          listingId: { in: existingListings.map(l => l.id) }
        }
      });

      if (existingApp) {
        console.log(`[OpenClaw] Skipping duplicate application for ${listing.company}: ${listing.url}`);
        continue;
      }
    }

    // Check Blacklist

    try {
      // Analyze Match
      const matchStatus = await scoreJobMatch(user.skills, `${listing.title} at ${listing.company}`);
      
      if (matchStatus.applyRecommendation && matchStatus.matchScore >= 65) {
        
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

        // Dynamically generate standard resume tailored to user skills
        const resumeData = {
          name: user.name || 'Student',
          email: user.email || '',
          tagline: user.targetRole || 'Software Professional',
          phone: user.OpenClawConfig?.phone || '+91 0000000000',
          linkedin: `linkedin.com/in/${user.name?.toLowerCase().replace(/ /g, '-')}`,
          github: `github.com/${user.name?.toLowerCase().replace(/ /g, '')}`,
          summary: `Motivated and skilled ${user.targetRole || 'Engineer'} with expertise in ${user.skills.slice(0, 5).map(s => s.skillName).join(', ')}. Applying for ${listing.title} at ${listing.company}.`,
          skills: {
            technical: user.skills.filter(s => s.category === 'technical').map(s => s.skillName),
            tools: user.skills.filter(s => s.category !== 'technical').map(s => s.skillName)
          },
          experience: parseText(typeof getSectionContent('experience') === 'string' ? getSectionContent('experience') as string : ''),
          projects: parseTextProjects(typeof getSectionContent('projects') === 'string' ? getSectionContent('projects') as string : ''),
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
        
        // Save to public dir so it can be downloaded permanently by the user later
        const resumeId = `cv_${Date.now()}`;
        const resumesDir = path.join(process.cwd(), 'public', 'resumes');
        await fs.mkdir(resumesDir, { recursive: true }).catch(() => {});
        const finalPath = path.join(resumesDir, `${resumeId}.pdf`);
        await fs.writeFile(finalPath, new Uint8Array(pdfBuffer));

        const resumeVersion = await prisma.resumeVersion.create({
          data: {
            id: resumeId,
            userId: user.id,
            targetJd: listing.url,
            cloudinaryUrl: `/resumes/${resumeId}.pdf`,
            atsScore: matchStatus.matchScore,
            generatedBy: 'AI'
          }
        });

        // Detect platform strictly from URL to avoid mislabeling
        const detectPlatform = (url: string): string => {
          const lower = url.toLowerCase();
          if (lower.includes('linkedin.com')) return 'linkedin';
          if (lower.includes('naukri.com')) return 'naukri';
          if (lower.includes('glassdoor.com')) return 'glassdoor';
          if (lower.includes('indeed.com')) return 'indeed';
          return 'generic';
        };

        const platform = detectPlatform(listing.url);
        const platformSession = (config.sessionData as any)?.[platform];
        const knownPlatforms = ['linkedin', 'naukri', 'glassdoor', 'indeed'];
        const requiresSession = knownPlatforms.includes(platform);

        // Save listing to DB first so all subsequent status records can reference it
        const savedListing = await prisma.openClawListing.create({
          data: {
            platform: platform,
            company: listing.company,
            role: listing.title,
            location: listing.location,
            ctcBand: listing.salary,
            jdText: listing.skills && listing.skills.length > 0 
                      ? 'Required skills: ' + listing.skills.join(', ')
                      : 'Emphasize experience in relevant modern stacks.',
            sourceUrl: listing.url
          }
        });

        // ─── SESSION ENFORCEMENT GATE ─────────────────────────────────────────
        // For all major job boards, we must have a linked authenticated session.
        // Without it, we would either hit a login wall or apply anonymously,
        // which is NOT the user's intent. Skip with a clear audit record.
        if (requiresSession && !platformSession) {
          console.warn(`[OpenClaw] Skipping ${listing.company} (${platform}): No linked session. User must link their ${platform} account in the OpenClaw dashboard.`);
          await prisma.openClawApplication.create({
            data: {
              userId: user.id,
              listingId: savedListing.id,
              matchScore: matchStatus.matchScore,
              resumeVersionId: resumeVersion.id,
              status: 'UnableToApply',
              screenshotUrl: null,
              tailoringNotes: `No ${platform} account linked. Link your account in the OpenClaw dashboard to enable real applications.`,
              appliedAt: new Date()
            }
          });
          continue;
        }

        // ─── EMAIL VALIDATION ──────────────────────────────────────────────────
        const applicationEmail = config.applicationEmail?.trim();
        if (!applicationEmail || applicationEmail.length < 5) {
          console.warn(`[OpenClaw] Skipping ${listing.company}: No valid application email configured.`);
          continue;
        }

        const applyStatus = await applyToJob({
          studentName: user.name,
          studentEmail: applicationEmail,
          studentPhone: config.phone || 'Not provided',
          jobUrl: listing.url,
          resumePdfPath: finalPath,
          sessionData: platformSession
        });

        // Record Application with truthful status
        await prisma.openClawApplication.create({
          data: {
            userId: user.id,
            listingId: savedListing.id,
            matchScore: matchStatus.matchScore,
            resumeVersionId: resumeVersion.id,
            status: applyStatus.success ? 'Applied' : 'Failed',
            screenshotUrl: applyStatus.screenshotUrl || null,
            tailoringNotes: matchStatus.tailoringNotes || 'No notes',
            appliedAt: new Date()
          }
        });

        if (applyStatus.success) appliedCount++;
      }
    } catch (apiError) {
      console.error(`AI Analysis/Application error for ${listing.company}:`, apiError);
    }
  }

  console.log(`OpenClaw finished for ${user.email}. Applied to ${appliedCount} jobs.`);
}
