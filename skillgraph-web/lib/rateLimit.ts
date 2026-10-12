/**
 * lib/rateLimit.ts
 *
 * Fixed-window rate limiter used by proxy.ts.
 *
 * The default store is in-memory, which protects a single instance (dev, a
 * single Node server, or a warm serverless instance). For multi-instance
 * production deployments, implement `RateLimitStore` on top of Redis/Upstash
 * and pass it to `setRateLimitStore()` — see docs/adr/ADR-001.
 */

export interface RateLimitStore {
  /** Increments the counter for `key` and returns the new count and window expiry (epoch ms). */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
}

class MemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>()
  private lastSweep = Date.now()

  async increment(key: string, windowMs: number) {
    const now = Date.now()
    this.sweep(now)

    const entry = this.hits.get(key)
    if (!entry || entry.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs }
      this.hits.set(key, fresh)
      return fresh
    }
    entry.count += 1
    return entry
  }

  // Drop expired windows at most once a minute so the map can't grow unbounded
  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return
    this.lastSweep = now
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key)
    }
  }
}

let store: RateLimitStore = new MemoryStore()

export function setRateLimitStore(next: RateLimitStore) {
  store = next
}

export type RateLimitRule = {
  /** Bucket name — requests matching the same rule share a counter per client. */
  name: string
  limit: number
  windowMs: number
  methods?: string[]
  match: (pathname: string) => boolean
}

const MINUTE = 60_000

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    // Login + all registration endpoints — credential stuffing / signup spam
    name: 'auth',
    limit: 10,
    windowMs: 15 * MINUTE,
    methods: ['POST'],
    match: (p) => p.startsWith('/api/auth/callback/credentials') || p.startsWith('/api/auth/register'),
  },
  {
    // Endpoints that call the LLM — bounds per-user AI spend
    name: 'ai',
    limit: 30,
    windowMs: 60 * MINUTE,
    methods: ['POST'],
    match: (p) =>
      p.startsWith('/api/ai/') ||
      p.startsWith('/api/resume/upload') ||
      p.startsWith('/api/resume/generate') ||
      p.startsWith('/api/resume-builder/score') ||
      p.startsWith('/api/gaps') ||
      p.startsWith('/api/sprints') ||
      p.startsWith('/api/openclaw/negotiate') ||
      p.startsWith('/api/openclaw/stories'),
  },
]

export type RateLimitResult =
  | { limited: false }
  | { limited: true; rule: RateLimitRule; retryAfterSec: number }

/**
 * Checks every matching rule for this request. `clientKey` should be the user id
 * when authenticated, otherwise the client IP.
 */
export async function checkRateLimit(
  method: string,
  pathname: string,
  clientKey: string
): Promise<RateLimitResult> {
  for (const rule of RATE_LIMIT_RULES) {
    if (rule.methods && !rule.methods.includes(method)) continue
    if (!rule.match(pathname)) continue

    const { count, resetAt } = await store.increment(`${rule.name}:${clientKey}`, rule.windowMs)
    if (count > rule.limit) {
      return { limited: true, rule, retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) }
    }
  }
  return { limited: false }
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
