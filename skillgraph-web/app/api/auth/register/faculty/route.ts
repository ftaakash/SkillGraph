import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, collegeName, city, state, tier, tpContactEmail } = body

    if (!name || !email || !password || !collegeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Upsert college institution
    let college = await prisma.collegeInstitution.findFirst({
      where: { name: collegeName, city: city || '' },
    })

    if (!college) {
      college = await prisma.collegeInstitution.create({
        data: {
          name: collegeName,
          city: city || '',
          state: state || '',
          tier: tier || 'Tier-2',
          tpContactEmail: tpContactEmail || email,
        },
      })
    }

    // Create user with FACULTY role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'FACULTY',
        collegeId: college.id,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
  } catch (error) {
    console.error('Faculty registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
