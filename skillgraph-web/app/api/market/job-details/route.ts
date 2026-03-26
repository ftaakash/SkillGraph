import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('job_id')
    
    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/job-details`,
      params: { job_id: jobId, extended_publisher_details: 'false' },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      }
    }

    const response = await axios.request(options)
    
    return NextResponse.json({ data: response.data?.data?.[0] ?? null })
  } catch (err: unknown) {
    console.error('[job-details API]', err)
    return NextResponse.json({ error: 'Failed to fetch job details' }, { status: 500 })
  }
}
