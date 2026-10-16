/**
 * OpenClaw browser extension access (ADR-004).
 *
 * The extension runs in the student's own browser, on job sites where they are already signed in.
 * It authenticates to SkillGraph with a revocable bearer token the student creates on the OpenClaw
 * page. SkillGraph never receives the student's job-site passwords, cookies or session tokens, and
 * the extension never presses Submit: the student reviews the filled form and submits it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/authTokens'

/** Job sites the extension supports. Their content scripts are listed in extension/manifest.json. */
export const EXTENSION_PLATFORMS = ['LinkedIn', 'Naukri', 'Glassdoor', 'Superset'] as const
export type ExtensionPlatform = (typeof EXTENSION_PLATFORMS)[number]

export const TOKEN_PREFIX = 'sgx_'

/** The student behind an extension request, or a 401 response. */
export async function extensionStudent(req: NextRequest): Promise<{ userId: string } | { error: NextResponse }> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const raw = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : ''
  const userId = raw ? await verifyAuthToken(raw, 'extension') : null
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role === 'STUDENT') return { userId }
  }
  return {
    error: NextResponse.json(
      { error: 'The extension is not connected. Open SkillGraph → Smart Apply and connect it again.' },
      { status: 401 },
    ),
  }
}

/** Profile values the extension uses to fill application forms. */
export async function autofillProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, college: true, branch: true, year: true, cgpa: true, linkedin: true, github: true,
      AcademicProfile: { select: { program: true, department: true } },
      OpenClawConfig: { select: { applicationEmail: true, phone: true, preferredCities: true } },
    },
  })
  if (!user) return null
  const parts = user.name.trim().split(/\s+/)
  const cities = Array.isArray(user.OpenClawConfig?.preferredCities) ? (user.OpenClawConfig!.preferredCities as string[]) : []
  return {
    fullName: user.name,
    firstName: parts[0] ?? user.name,
    lastName: parts.slice(1).join(' '),
    email: user.OpenClawConfig?.applicationEmail || user.email,
    phone: user.OpenClawConfig?.phone ?? '',
    linkedin: user.linkedin ?? '',
    github: user.github ?? '',
    college: user.college ?? '',
    degree: user.AcademicProfile?.program ?? '',
    branch: user.branch ?? user.AcademicProfile?.department ?? '',
    year: user.year ?? '',
    cgpa: user.cgpa != null ? String(user.cgpa) : '',
    city: cities.find(c => !/remote/i.test(c)) ?? '',
  }
}
