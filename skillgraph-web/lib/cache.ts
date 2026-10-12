/**
 * Small per-instance TTL cache for expensive, non-personal reads (market analytics, public stats).
 * Concurrent misses for the same key share one computation, so a traffic spike on a cold
 * instance results in a single database query.
 */
type Entry = { value: unknown; expires: number }

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()
const MAX_ENTRIES = 500

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const promise = compute()
    .then(value => {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value!)
      store.set(key, { value, expires: Date.now() + ttlMs })
      return value
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}

/** Cache-Control for public, non-personal JSON that a CDN may serve to everyone. */
export const PUBLIC_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'
