import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { emailInUse, consentFields, sendVerification } from '@/lib/accounts'
import { facultyRegisterSchema, firstIssue } from '@/lib/validation/auth'
import { generateCode, normaliseCode } from '@/lib/tenant'

/**
 * Faculty registration. A new college gets a workspace with this faculty member as its admin.
 * Joining an existing college requires that workspace's faculty invite code — matching by
 * name alone would let anyone read another college's student data.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = facultyRegisterSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const { name, email, password, collegeName, city, state, tier, tpContactEmail, inviteCode } = parsed.data

    if (await emailInUse(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    let collegeId: string
    let isCollegeAdmin = false

    if (inviteCode) {
      const college = await prisma.collegeInstitution.findUnique({
        where: { facultyInviteCode: normaliseCode(inviteCode) },
        select: { id: true },
      })
      if (!college) return NextResponse.json({ error: 'That faculty invite code is not valid' }, { status: 400 })
      collegeId = college.id
    } else {
      const existing = await prisma.collegeInstitution.findFirst({
        where: { name: { equals: collegeName, mode: 'insensitive' }, city: { equals: city || '', mode: 'insensitive' } },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Your college already has a SkillGraph workspace. Ask your placement-cell admin for the faculty invite code.', code: 'invite_required' },
          { status: 409 }
        )
      }
      const college = await prisma.collegeInstitution.create({
        data: {
          name: collegeName,
          city: city || '',
          state: state || '',
          tier: tier || 'Tier-2',
          tpContactEmail: tpContactEmail || email,
          joinCode: generateCode(),
          facultyInviteCode: generateCode(10),
        },
      })
      collegeId = college.id
      isCollegeAdmin = true
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'FACULTY',
        ...consentFields(),
        collegeId,
        isCollegeAdmin,
      },
    })

    await sendVerification(user)

    return NextResponse.json({ id: user.id, email: user.email, role: user.role, isCollegeAdmin }, { status: 201 })
  } catch (error) {
    console.error('Faculty registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
