import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobTitle = searchParams.get('job_title')
    const location = searchParams.get('location') ?? 'India'
    const radius = searchParams.get('radius') ?? '100'

    if (!jobTitle) {
      return NextResponse.json({ error: 'job_title is required' }, { status: 400 })
    }

    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/estimated-salary`,
      params: { 
        job_title: jobTitle, 
        location: location, 
        radius: radius 
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      }
    }

    const response = await axios.request(options)
    
    // API returns array of salary estimations
    return NextResponse.json({ 
      data: response.data?.data ?? [] 
    })
  } catch (err: unknown) {
    console.error('[company-salary API]', err)
    return NextResponse.json({ error: 'Failed to fetch estimated salaries' }, { status: 500 })
  }
}
