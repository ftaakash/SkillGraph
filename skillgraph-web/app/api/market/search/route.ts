import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')
    const page = searchParams.get('page') ?? '1'
    
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/search`,
      params: { 
        query: query, 
        page: page,
        num_pages: '1',
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      }
    }

    const response = await axios.request(options)
    
    return NextResponse.json({ 
      data: response.data?.data ?? [] 
    })
  } catch (err: unknown) {
    console.error('[market-search API]', err)
    return NextResponse.json({ error: 'Failed to search jobs' }, { status: 500 })
  }
}
