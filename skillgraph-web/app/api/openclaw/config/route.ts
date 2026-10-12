import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api'
import { firstIssue } from '@/lib/validation/auth'

const list = z.array(z.string().trim().min(1).max(100)).max(20)

// Every field optional so the page can save the form or just toggle isActive
const configSchema = z.object({
  targetRoles: list.optional(),
  preferredCities: list.optional(),
  blacklistedCompanies: list.optional(),
  minCtcLpa: z.coerce.number().min(0).max(500).optional(),
  dailyLimit: z.coerce.number().int().min(1).max(25).optional(),
  isActive: z.boolean().optional(),
  applicationEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
}).strict()

const PUBLIC_FIELDS = {
  id: true, targetRoles: true, preferredCities: true, minCtcLpa: true, dailyLimit: true,
  blacklistedCompanies: true, isActive: true, applicationEmail: true, phone: true,
} as const

// GET /api/openclaw/config
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const config = await prisma.openClawConfig.findUnique({ where: { userId: session.user.id }, select: PUBLIC_FIELDS })
    return ok({ config })
  } catch (err) {
    console.error('[openclaw/config GET]', err)
    return serverError()
  }
}

// PUT/PATCH /api/openclaw/config — partial update (creates the config on first save)
async function upsertConfig(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const parsed = configSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstIssue(parsed.error))
    const { applicationEmail, phone, ...rest } = parsed.data
    const data = {
      ...rest,
      ...(applicationEmail !== undefined ? { applicationEmail: applicationEmail || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
    }

    const config = await prisma.openClawConfig.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        targetRoles: data.targetRoles ?? ['Software Engineer'],
        preferredCities: data.preferredCities ?? ['Remote'],
        blacklistedCompanies: data.blacklistedCompanies ?? [],
        minCtcLpa: data.minCtcLpa ?? 3,
        dailyLimit: data.dailyLimit ?? 10,
        isActive: data.isActive ?? false,
        applicationEmail: data.applicationEmail ?? null,
        phone: data.phone ?? null,
      },
      select: PUBLIC_FIELDS,
    })
    return ok({ config })
  } catch (err) {
    console.error('[openclaw/config PUT]', err)
    return serverError()
  }
}

export const PUT = upsertConfig
export const PATCH = upsertConfig
