/**
 * lib/rateLimit.ts
 *
 * Fixed-window rate limiter used by proxy.ts.
 *
 * Set RATE_LIMIT_REDIS_URL (redis:// or rediss://) to share counters across
 * instances; otherwise an in-memory store protects a single instance only
 * (dev, a single Node server, or a warm serverless instance).
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

/**
 * Shared counter in Redis so limits hold across serverless instances.
 * Falls back to the in-memory store on any Redis error — a Redis outage must not block logins.
 */
class RedisStore implements RateLimitStore {
  private client: Promise<import('ioredis').default> | null = null
  private retryAfter = 0
  private static RETRY_COOLDOWN_MS = 30_000

  constructor(private url: string, private fallback: RateLimitStore) {}

  /** Connects once; after a failure, requests use the fallback until the cooldown passes. */
  private connect(): Promise<import('ioredis').default> {
    if (!this.client) {
      if (Date.now() < this.retryAfter) return Promise.reject(new Error('redis unavailable (cooling down)'))
      this.client = import('ioredis').then(async ({ default: Redis }) => {
        const client = new Redis(this.url, {
          lazyConnect: true,
          connectTimeout: 2_000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null, // reconnects are driven by connect() + cooldown, not in the background
        })
        client.on('error', (err) => console.warn('[rateLimit] redis error:', err.message))
        client.on('end', () => { this.client = null })
        try {
          await client.connect()
        } catch (err) {
          client.disconnect()
          throw err
        }
        return client
      })
      this.client.catch(() => {
        this.client = null
        this.retryAfter = Date.now() + RedisStore.RETRY_COOLDOWN_MS
      })
    }
    return this.client
  }

  async increment(key: string, windowMs: number) {
    try {
      const redis = await this.connect()
      const redisKey = `rl:${key}`
      const [[, count], [, ttl]] = (await redis
        .multi()
        .incr(redisKey)
        .pttl(redisKey)
        .exec()) as [[null, number], [null, number]]
      if (ttl < 0) await redis.pexpire(redisKey, windowMs)
      return { count, resetAt: Date.now() + (ttl > 0 ? ttl : windowMs) }
    } catch (err) {
      console.warn('[rateLimit] falling back to memory store:', (err as Error).message)
      return this.fallback.increment(key, windowMs)
    }
  }
}

const memoryStore = new MemoryStore()
let store: RateLimitStore = process.env.RATE_LIMIT_REDIS_URL
  ? new RedisStore(process.env.RATE_LIMIT_REDIS_URL, memoryStore)
  : memoryStore

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
    // Creating payment orders and confirming payments
    name: 'billing',
    limit: 20,
    windowMs: 60 * MINUTE,
    methods: ['POST'],
    match: (p) => p.startsWith('/api/billing/checkout') || p.startsWith('/api/billing/verify'),
  },
  {
    // Login + all registration endpoints — credential stuffing / signup spam
    name: 'auth',
    limit: 10,
    windowMs: 15 * MINUTE,
    methods: ['POST'],
    match: (p) =>
      p.startsWith('/api/auth/callback/credentials') ||
      p.startsWith('/api/auth/register') ||
      p.startsWith('/api/auth/password') ||
      p.startsWith('/api/auth/verify-email'),
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
