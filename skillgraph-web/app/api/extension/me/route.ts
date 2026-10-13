import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError } from '@/lib/api'
import { extensionStudent, autofillProfile } from '@/lib/extension'
import { filtersFromConfig } from '@/lib/openclaw/filters'

// GET /api/extension/me — who the extension is signed in as, their autofill values and job filters
export async function GET(req: NextRequest) {
  try {
    const auth = await extensionStudent(req)
    if ('error' in auth) return auth.error
    const [profile, config] = await Promise.all([
      autofillProfile(auth.userId),
      prisma.openClawConfig.findUnique({ where: { userId: auth.userId } }),
    ])
    return ok({ profile, filters: config ? filtersFromConfig(config) : null })
  } catch (err) {
    console.error('[extension/me]', err)
    return serverError()
  }
}
