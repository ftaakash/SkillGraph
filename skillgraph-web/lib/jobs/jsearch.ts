/**
 * JSearch (RapidAPI) proxy for the Market page's live job search, job details and salary lookups.
 * Every call spends paid quota, so inputs are bounded, identical lookups are cached per instance,
 * and proxy.ts rate-limits the routes (lib/rateLimit.ts, `market_api`).
 */
import { NextResponse } from 'next/server'
import { cached } from '@/lib/cache'

const TIMEOUT_MS = 10_000
const TTL_MS = 30 * 60 * 1000

export class JSearchUnavailable extends Error {}

/** GETs a JSearch endpoint and returns its `data` field. Results are cached for 30 minutes. */
export async function jsearch(path: string, params: Record<string, string>): Promise<unknown> {
  const host = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com'
  const key = process.env.RAPIDAPI_KEY
  if (!key) throw new JSearchUnavailable('RAPIDAPI_KEY is not set')

  const query = new URLSearchParams(params).toString()
  return cached(`jsearch:${path}?${query}`, TTL_MS, async () => {
    const res = await fetch(`https://${host}${path}?${query}`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`JSearch ${path} responded with HTTP ${res.status}`)
    const body = (await res.json()) as { data?: unknown }
    return body.data ?? null
  })
}

/** Bounded, trimmed query parameter, or null when missing. */
export function param(searchParams: URLSearchParams, name: string, max = 200): string | null {
  const value = searchParams.get(name)?.trim().slice(0, max)
  return value || null
}

export function jsearchFailure(err: unknown, label: string, message: string) {
  if (err instanceof JSearchUnavailable) {
    return NextResponse.json({ error: 'Live job search is not configured on this server.' }, { status: 503 })
  }
  console.error(`[${label}]`, err)
  return NextResponse.json({ error: message }, { status: 502 })
}
