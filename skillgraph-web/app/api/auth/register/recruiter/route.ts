import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { emailInUse, consentFields, sendVerification } from '@/lib/accounts'
import { recruiterRegisterSchema, firstIssue } from '@/lib/validation/auth'

export async function POST(req: NextRequest) {
  try {
    const parsed = recruiterRegisterSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const { name, email, password, companyName, companyWebsite, tier, hrEmail } = parsed.data

    // Check if user already exists
    if (await emailInUse(email)) {
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
        ...consentFields(),
        companyId: company.id,
        isVerified: false,
      },
    })

    await sendVerification(user)

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
  } catch (error) {
    console.error('Recruiter registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
