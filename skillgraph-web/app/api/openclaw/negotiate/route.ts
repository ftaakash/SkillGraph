import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api'
import { generateNegotiationScripts, getNegotiationScript } from '@/lib/openclaw/negotiator'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const userId = session.user.id as string

    const { listingId, offeredCtcLpa, competingOfferCtcLpa } = await req.json()
    if (!listingId) return badRequest('listingId is required')

    const listing = await prisma.openClawListing.findUnique({ where: { id: listingId } })
    if (!listing) return badRequest('Listing not found')

    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { select: { skillName: true } } },
    })

    const record = await generateNegotiationScripts(
      userId,
      listingId,
      listing.role,
      listing.company,
      offeredCtcLpa ?? 10,
      competingOfferCtcLpa ?? null,
      student?.skills.map(s => s.skillName) ?? [],
      listing.location ?? 'India'
    )

    return ok({ scripts: record })
  } catch (err) {
    console.error('[openclaw/negotiate]', err)
    return serverError()
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const { searchParams } = new URL(req.url)
    const listingId = searchParams.get('listingId')
    if (!listingId) return badRequest('listingId required')

    const script = await getNegotiationScript(session.user.id as string, listingId)
    return ok({ script })
  } catch (err) {
    console.error('[openclaw/negotiate GET]', err)
    return serverError()
  }
}
