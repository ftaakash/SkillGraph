/**
 * Outbound HTTP for user-supplied URLs.
 *
 * Guards against server-side request forgery: only http(s) on default ports, every
 * resolved address must be public, redirects are followed manually and re-checked,
 * and responses are size- and time-bounded. No JavaScript is executed and no
 * cookies or credentials are ever sent.
 */
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { JobSourceError } from './types'

const USER_AGENT = 'SkillGraphBot/1.0 (+https://github.com/ftaakash/SkillGraph; job-description preview)'
const TIMEOUT_MS = 10_000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

const BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ipv4ToInt(ip)
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
      return (n & mask) === (ipv4ToInt(base) & mask)
    })
  }
  const v6 = ip.toLowerCase()
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateAddress(mapped[1])
  return (
    v6 === '::' || v6 === '::1' ||
    v6.startsWith('fc') || v6.startsWith('fd') || // unique local
    /^fe[89ab]/.test(v6) || // link-local
    v6.startsWith('ff') // multicast
  )
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new JobSourceError('invalid_url', 'That is not a valid URL.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new JobSourceError('invalid_url', 'Only http(s) links are supported.')
  }
  if (url.username || url.password) throw new JobSourceError('invalid_url', 'Links with credentials are not allowed.')
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new JobSourceError('blocked_address', 'Non-standard ports are not allowed.')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map(a => a.address)
  if (addresses.length === 0) throw new JobSourceError('fetch_failed', `Could not resolve ${url.hostname}.`)
  if (addresses.some(isPrivateAddress)) {
    throw new JobSourceError('blocked_address', 'That address is not publicly reachable.')
  }
  return url
}

/** GETs a user-supplied URL with SSRF protection. Returns the final URL and body text. */
export async function safeFetchText(raw: string, accept = 'text/html,application/json;q=0.9,*/*;q=0.5') {
  let current = await assertPublicUrl(raw)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
    }).catch((err: Error) => {
      throw new JobSourceError('fetch_failed', `Could not reach ${current.hostname}: ${err.message}`)
    })

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = await assertPublicUrl(new URL(res.headers.get('location')!, current).toString())
      continue
    }
    if (res.status === 404) throw new JobSourceError('not_found', 'The job posting was not found (404).')
    if (!res.ok) throw new JobSourceError('fetch_failed', `${current.hostname} responded with HTTP ${res.status}.`)

    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) throw new JobSourceError('fetch_failed', 'The page is too large to process.')
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) throw new JobSourceError('fetch_failed', 'The page is too large to process.')

    return { url: current.toString(), contentType: res.headers.get('content-type') ?? '', text: new TextDecoder().decode(buf) }
  }
  throw new JobSourceError('fetch_failed', 'Too many redirects.')
}

/** Fetches JSON from a fixed, trusted API host (official job-board APIs). */
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(init.headers ?? {}) },
  }).catch((err: Error) => {
    throw new JobSourceError('fetch_failed', `Job source unreachable: ${err.message}`)
  })
  if (res.status === 404) throw new JobSourceError('not_found', 'The job posting was not found.')
  if (!res.ok) throw new JobSourceError('fetch_failed', `Job source responded with HTTP ${res.status}.`)
  return res.json() as Promise<T>
}
