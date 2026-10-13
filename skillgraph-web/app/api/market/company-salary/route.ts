import { NextRequest, NextResponse } from 'next/server'
import { jsearch, jsearchFailure, param } from '@/lib/jobs/jsearch'

// GET /api/market/company-salary?job_title=&location=&radius= — estimated salaries (JSearch)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobTitle = param(searchParams, 'job_title', 100)
    if (!jobTitle) return NextResponse.json({ error: 'job_title is required' }, { status: 400 })
    const location = param(searchParams, 'location', 100) ?? 'India'
    const radius = String(Math.min(Math.max(Number(searchParams.get('radius')) || 100, 1), 500))

    // The API returns an array of salary estimates
    const data = await jsearch('/estimated-salary', { job_title: jobTitle, location, radius })
    return NextResponse.json({ data: Array.isArray(data) ? data : [] })
  } catch (err) {
    return jsearchFailure(err, 'market/company-salary', 'Failed to fetch estimated salaries')
  }
}
