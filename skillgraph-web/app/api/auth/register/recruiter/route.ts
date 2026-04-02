import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName, companyWebsite, tier, hrEmail } = body

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Upsert company
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    })

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          website: companyWebsite || null,
          tier: tier || 'MNC',
          hrEmail: hrEmail || email,
          verificationStatus: 'pending',
        },
      })
    }

    // Create user with RECRUITER role (not verified until admin approves)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'RECRUITER',
        companyId: company.id,
        isVerified: false,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
  } catch (error) {
    console.error('Recruiter registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
