import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — return user's OpenClaw config
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.openClawConfig.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ config })
}

// PUT — create or update OpenClaw config
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { targetRoles, preferredCities, minCtcLpa, dailyLimit, blacklistedCompanies, isActive } = body

  const config = await prisma.openClawConfig.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      targetRoles: targetRoles ?? [],
      preferredCities: preferredCities ?? [],
      minCtcLpa: minCtcLpa ?? 0,
      dailyLimit: dailyLimit ?? 10,
      blacklistedCompanies: blacklistedCompanies ?? [],
      isActive: isActive ?? true,
    },
    update: {
      targetRoles: targetRoles ?? undefined,
      preferredCities: preferredCities ?? undefined,
      minCtcLpa: minCtcLpa ?? undefined,
      dailyLimit: dailyLimit ?? undefined,
      blacklistedCompanies: blacklistedCompanies ?? undefined,
      isActive: isActive ?? undefined,
    },
  })

  return NextResponse.json({ config })
}
