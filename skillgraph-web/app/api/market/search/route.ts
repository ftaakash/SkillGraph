import { NextRequest, NextResponse } from 'next/server'
import { jsearch, jsearchFailure, param } from '@/lib/jobs/jsearch'

// GET /api/market/search?query=&page= — live job search (JSearch)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = param(searchParams, 'query')
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })
    const page = String(Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 10))

    const data = await jsearch('/search', { query, page, num_pages: '1' })
    return NextResponse.json({ data: Array.isArray(data) ? data : [] })
  } catch (err) {
    return jsearchFailure(err, 'market/search', 'Failed to search jobs')
  }
}
