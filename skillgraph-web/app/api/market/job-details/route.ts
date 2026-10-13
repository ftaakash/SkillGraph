import { NextRequest, NextResponse } from 'next/server'
import { jsearch, jsearchFailure, param } from '@/lib/jobs/jsearch'

// GET /api/market/job-details?job_id= — one JSearch listing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = param(searchParams, 'job_id', 300)
    if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 })

    const data = await jsearch('/job-details', { job_id: jobId, extended_publisher_details: 'false' })
    return NextResponse.json({ data: Array.isArray(data) ? (data[0] ?? null) : null })
  } catch (err) {
    return jsearchFailure(err, 'market/job-details', 'Failed to fetch job details')
  }
}
