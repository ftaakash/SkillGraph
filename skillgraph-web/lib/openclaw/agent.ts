/**
 * OpenClaw "assisted apply" agent (ADR-001, Phase 2).
 *
 * Finds roles through licensed job APIs, scores fit, and for strong matches prepares a
 * tailored résumé. Each match is queued as `ReadyToApply`; the student opens the
 * employer's posting and submits themselves. The agent never logs into or automates
 * third-party sites and never stores third-party credentials.
 */
import type { JobListing } from '@/lib/jobs'
import { discoverJobs, discoveryConfigured } from '@/lib/jobs'
import { prisma } from '@/lib/prisma'
import { generateText } from '@/lib/ai'
import { PROMPTS } from '@/lib/openai'
import { generateResumePDFBuffer } from '@/lib/resume/exporter'
import { putPrivateFile } from '@/lib/storage'
import { scoreJobMatch } from './matcher'
import { OPEN_STATUSES } from './status'

const MIN_MATCH_SCORE = 65

export type AgentRunResult = {
  status: 'completed' | 'inactive' | 'no_sources' | 'limit_reached'
  discovered: number
  evaluated: number
  prepared: number
  skipped: { duplicate: number; blacklisted: number; lowMatch: number; failed: number }
}

type StoredContent = unknown

/** Reads a ResumeSection content blob that may be a string, {text}, or an array. */
function sectionText(content: StoredContent): string | unknown[] | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content
  if (content && typeof content === 'object' && 'text' in content && typeof (content as { text: unknown }).text === 'string') {
    return (content as { text: string }).text
  }
  return null
}

function toLines(content: StoredContent): string[] {
  const value = sectionText(content)
  if (typeof value === 'string') return value.split('\n').filter(Boolean)
  if (Array.isArray(value)) return value.map(String)
  return []
}

function parseExperience(text: string) {
  return text.split(/\n\n+/).filter(Boolean).map(block => {
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

function parseProjects(text: string) {
  return text.split(/\n\n+/).filter(Boolean).map(block => {
    const lines = block.split('\n').filter(Boolean)
    return {
      name: lines[0] || 'Project',
      techStack: (lines[1] || '').split(',').map(t => t.trim()),
      date: lines[2] || '',
      bullets: lines.slice(3),
    }
  })
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function processOpenClawAgent(userId: string): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    status: 'completed',
    discovered: 0,
    evaluated: 0,
    prepared: 0,
    skipped: { duplicate: 0, blacklisted: 0, lowMatch: 0, failed: 0 },
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      OpenClawConfig: true,
      skills: true,
      ResumeVersions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  const config = user?.OpenClawConfig
  if (!user || !config || !config.isActive) return { ...result, status: 'inactive' }
  if (!discoveryConfigured()) return { ...result, status: 'no_sources' }

  // Daily limit counts everything the agent prepared today
  const preparedToday = await prisma.openClawApplication.count({
    where: { userId, status: 'ReadyToApply', appliedAt: { gte: startOfToday() } },
  })
  const remaining = Math.max(0, config.dailyLimit - preparedToday)
  if (remaining === 0) return { ...result, status: 'limit_reached' }

  const roles = asStringArray(config.targetRoles, ['Software Engineer'])
  const cities = asStringArray(config.preferredCities, ['Remote'])
  const blacklist = asStringArray(config.blacklistedCompanies, []).map(c => c.toLowerCase())

  // Evaluate at most twice the remaining budget to bound AI cost per run
  const listings = await discoverJobs(roles, cities, Math.min(remaining * 2, 20))
  result.discovered = listings.length

  const sections = await prisma.resumeSection.findMany({
    where: { resumeVersionId: user.ResumeVersions[0]?.id ?? 'none' },
  })
  const section = (...types: string[]) =>
    sections.find(s => types.includes(s.type.toLowerCase()))?.content ?? null
  const skillNames = user.skills.map(s => s.skillName)

  for (const listing of listings) {
    if (result.prepared >= remaining) break

    if (blacklist.some(b => listing.company.toLowerCase().includes(b))) {
      result.skipped.blacklisted++
      continue
    }
    if (await alreadyInPipeline(userId, listing)) {
      result.skipped.duplicate++
      continue
    }

    try {
      result.evaluated++
      const match = await scoreJobMatch(userId, skillNames, `${listing.role} at ${listing.company}\n\n${listing.jdText}`)
      if (!match.applyRecommendation || match.matchScore < MIN_MATCH_SCORE || match.confidenceLevel === 'low') {
        result.skipped.lowMatch++
        continue
      }

      // ── Résumé-first: only the summary is tailored; everything else is the student's own data ──
      const storedSummary = sectionText(section('summary', 'about'))
      const baseSummary = typeof storedSummary === 'string' && storedSummary.length > 20
        ? storedSummary
        : `${user.name} is a ${user.targetRole || 'Software Engineer'} with expertise in ${skillNames.slice(0, 4).join(', ')}.`

      let tailoredSummary = baseSummary
      try {
        tailoredSummary = await generateText({
          feature: 'openclaw_summary',
          system: PROMPTS.TAILORED_SUMMARY,
          prompt: `Candidate summary: "${baseSummary}"\n\nJob: ${listing.role} at ${listing.company}\nJD excerpt: ${listing.jdText.slice(0, 1200)}\n\nWrite the tailored summary now:`,
          userId,
        })
      } catch (err) {
        console.warn('[OpenClaw] summary tailoring failed, using stored summary:', (err as Error).message)
      }

      const experience = sectionText(section('experience'))
      const projects = sectionText(section('projects'))
      const education = sectionText(section('education'))
      const pdfBuffer = await generateResumePDFBuffer({
        name: user.name || 'Student',
        email: config.applicationEmail || user.email,
        tagline: user.targetRole || 'Software Professional',
        phone: config.phone || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        summary: tailoredSummary,
        skills: {
          technical: user.skills.filter(s => s.category === 'technical').map(s => s.skillName),
          tools: user.skills.filter(s => s.category !== 'technical').map(s => s.skillName),
        },
        experience: typeof experience === 'string' ? parseExperience(experience) : Array.isArray(experience) ? experience : [],
        projects: typeof projects === 'string' ? parseProjects(projects) : Array.isArray(projects) ? projects : [],
        education: Array.isArray(education)
          ? education
          : [{
              degree: user.branch ? `${user.branch} (${user.year})` : 'Degree Candidate',
              college: user.college || 'University',
              cgpa: user.cgpa?.toString() || '—',
              year: user.year || '',
              location: 'India',
            }],
        achievements: toLines(section('achievements', 'honor')),
        activities: toLines(section('activities', 'organization')),
      })

      const resumeId = `cv_${Date.now()}`
      const storedRef = await putPrivateFile('resumes', `${resumeId}.pdf`, new Uint8Array(pdfBuffer))

      await prisma.$transaction(async tx => {
        const resumeVersion = await tx.resumeVersion.create({
          data: { id: resumeId, userId, targetJd: listing.sourceUrl, cloudinaryUrl: storedRef, atsScore: match.matchScore, generatedBy: 'AI' },
        })
        const saved = await tx.openClawListing.create({
          data: {
            platform: listing.platform,
            company: listing.company,
            role: listing.role,
            location: listing.location,
            ctcBand: listing.ctcBand,
            jdText: listing.jdText,
            sourceUrl: listing.sourceUrl,
          },
        })
        await tx.openClawApplication.create({
          data: {
            userId,
            listingId: saved.id,
            matchScore: match.matchScore,
            resumeVersionId: resumeVersion.id,
            status: 'ReadyToApply',
            tailoringNotes: match.tailoringNotes || null,
          },
        })
      })
      result.prepared++
    } catch (err) {
      result.skipped.failed++
      console.error(`[OpenClaw] could not prepare ${listing.company} / ${listing.role}:`, (err as Error).message)
    }
  }

  if (result.prepared > 0) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'system',
        title: `${result.prepared} application${result.prepared === 1 ? '' : 's'} ready to submit`,
        body: 'OpenClaw prepared tailored résumés for strong matches. Review them and apply on the employer’s site.',
        link: '/openclaw',
      },
    }).catch(err => console.warn('[OpenClaw] notification failed:', err.message))
  }

  console.log(`[OpenClaw] user ${userId}:`, JSON.stringify(result))
  return result
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  const list = Array.isArray(value) ? value.map(String).map(s => s.trim()).filter(Boolean) : []
  return list.length > 0 ? list : fallback
}

async function alreadyInPipeline(userId: string, listing: JobListing) {
  const existing = await prisma.openClawApplication.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_STATUSES] },
      listing: {
        OR: [
          { sourceUrl: listing.sourceUrl },
          {
            company: { equals: listing.company, mode: 'insensitive' },
            role: { equals: listing.role, mode: 'insensitive' },
          },
        ],
      },
    },
    select: { id: true },
  })
  return Boolean(existing)
}
