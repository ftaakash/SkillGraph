import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const CITIES = ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'NCR', 'Remote']
const ROLES = ['SDE', 'Data Analyst', 'ML Engineer', 'DevOps', 'Full Stack', 'Android', 'iOS', 'Backend', 'Frontend']
const TIERS = ['FAANG', 'Unicorn', 'MNC', 'Service', 'Startup']

const SKILLS_BY_ROLE: Record<string, string[]> = {
  SDE: ['Java', 'C++', 'DSA', 'System Design', 'Spring Boot'],
  'Data Analyst': ['Python', 'SQL', 'Pandas', 'Power BI', 'Tableau'],
  'ML Engineer': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'MLOps'],
  DevOps: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'],
  'Full Stack': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Redis'],
  Android: ['Kotlin', 'Jetpack Compose', 'Android SDK', 'Firebase', 'Retrofit'],
  iOS: ['Swift', 'SwiftUI', 'Xcode', 'Core Data', 'ARKit'],
  Backend: ['Node.js', 'Go', 'Python', 'REST APIs', 'Microservices'],
  Frontend: ['React', 'Next.js', 'TypeScript', 'CSS', 'Figma'],
}

const CTC_BY_TIER: Record<string, number> = {
  FAANG: 42,
  Unicorn: 22,
  MNC: 12,
  Service: 5,
  Startup: 9,
}

// POST /api/market/india/seed — inserts demo data into IndiaMarketData
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Prevent flooding — only allow seeding if data is sparse
    const existing = await prisma.indiaMarketData.count()
    if (existing > 50) {
      return NextResponse.json({ message: `Already seeded with ${existing} records`, seeded: 0 })
    }

    const records: {
      skill: string
      role: string
      city: string
      demandCount: number
      avgCtcLpa: number
      companyTier: string
      weekOf: Date
    }[] = []
    const weekOf = new Date()
    weekOf.setDate(weekOf.getDate() - weekOf.getDay()) // Start of this week

    for (const city of CITIES) {
      for (const role of ROLES) {
        const skills = SKILLS_BY_ROLE[role] || ['JavaScript', 'Python']
        for (const tier of TIERS) {
          for (const skill of skills.slice(0, 3)) {
            // Randomise demand to feel realistic
            const baseDemand = tier === 'FAANG' ? 12 : tier === 'Unicorn' ? 28 : tier === 'MNC' ? 45 : tier === 'Service' ? 90 : 20
            const cityMultiplier = city === 'Bangalore' ? 1.8 : city === 'Hyderabad' ? 1.5 : city === 'Remote' ? 0.9 : 1.0
            records.push({
              skill,
              role,
              city,
              demandCount: Math.round(baseDemand * cityMultiplier * (0.7 + Math.random() * 0.6)),
              avgCtcLpa: CTC_BY_TIER[tier] * (0.8 + Math.random() * 0.4),
              companyTier: tier,
              weekOf,
            })
          }
        }
      }
    }

    await prisma.indiaMarketData.createMany({ data: records, skipDuplicates: true })

    return NextResponse.json({ message: 'Seeded successfully', seeded: records.length })
  } catch (err) {
    console.error('[market/india/seed POST]', err)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}

// GET — return seed status
export async function GET() {
  const count = await prisma.indiaMarketData.count()
  return NextResponse.json({ recordCount: count, seeded: count > 0 })
}
