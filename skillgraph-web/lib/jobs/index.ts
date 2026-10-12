/**
 * lib/jobs — compliant job ingestion (ADR-001, Phase 2).
 *
 * SkillGraph never logs into, scrapes, or automates third-party job boards. Listings come from:
 *   1. Official public ATS APIs (Greenhouse, Lever, Ashby) when the user pastes such a link
 *   2. A single SSRF-guarded GET of other public pages (company career sites) — no JS, no cookies
 *   3. Licensed aggregator APIs (JSearch, Adzuna) for discovery
 *   4. Job-description text pasted by the user (required for LinkedIn, Naukri, Indeed, Glassdoor)
 */
import { safeFetchText } from './http'
import {
  parseGreenhouseUrl, fetchGreenhouseJob,
  parseLeverUrl, fetchLeverJob,
  parseAshbyUrl, fetchAshbyJob,
  searchJSearch, searchAdzuna, jsearchConfigured, adzunaConfigured,
} from './sources'
import { htmlToText, extractTitle } from './text'
import { JobSourceError, type JobListing } from './types'

export { JobSourceError, type JobListing } from './types'
export { extractSkillsFromJD } from './text'

/** Boards whose terms prohibit automated access. We link out to them but never fetch them. */
const RESTRICTED_HOSTS = ['linkedin.com', 'naukri.com', 'indeed.com', 'glassdoor.com', 'glassdoor.co.in', 'monster.com', 'foundit.in', 'instahyre.com']

export function isRestrictedHost(hostname: string) {
  const host = hostname.toLowerCase()
  return RESTRICTED_HOSTS.some(h => host === h || host.endsWith(`.${h}`) || host.includes(`.${h.split('.')[0]}.`))
}

const MIN_JD_CHARS = 200

/** Turns a job link into a normalised listing using only permitted access paths. */
export async function resolveJobFromUrl(raw: string): Promise<JobListing> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new JobSourceError('invalid_url', 'That is not a valid URL.')
  }

  if (isRestrictedHost(url.hostname)) {
    throw new JobSourceError(
      'unsupported_source',
      `${url.hostname.replace(/^www\./, '')} does not allow automated access. Paste the job description text instead.`
    )
  }

  const gh = parseGreenhouseUrl(url)
  if (gh) return fetchGreenhouseJob(gh.board, gh.id, url.toString())
  const lever = parseLeverUrl(url)
  if (lever) return fetchLeverJob(lever.company, lever.id, lever.eu, url.toString())
  const ashby = parseAshbyUrl(url)
  if (ashby) return fetchAshbyJob(ashby.org, ashby.id, url.toString())

  // Generic public page (company careers site): one guarded GET, static HTML only
  const page = await safeFetchText(url.toString())
  if (!/html|text\/plain/i.test(page.contentType)) {
    throw new JobSourceError('no_content', 'That link does not point to a readable job page.')
  }
  const jdText = htmlToText(page.text).slice(0, 8000)
  const role = extractTitle(page.text)
  if (!role || jdText.length < MIN_JD_CHARS) {
    throw new JobSourceError('no_content', 'Could not read a job description from that page. Paste the job description text instead.')
  }
  const host = new URL(page.url).hostname.replace(/^(www|careers|jobs)\./, '')
  return {
    platform: 'Web',
    company: host.split('.')[0].replace(/\b\w/g, c => c.toUpperCase()),
    role,
    location: jdText.match(/\b(Bangalore|Bengaluru|Mumbai|Delhi|Hyderabad|Chennai|Pune|Kolkata|Gurgaon|Gurugram|Noida|Remote)\b/i)?.[0] ?? null,
    ctcBand: jdText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*LPA/i)?.[0] ?? null,
    jdText,
    sourceUrl: page.url,
  }
}

/** Builds a listing from text the user pasted (used for restricted boards). */
export function listingFromPastedText(input: {
  jdText: string
  company: string
  role: string
  location?: string | null
  sourceUrl?: string | null
}): JobListing {
  const jdText = input.jdText.trim().slice(0, 8000)
  if (jdText.length < MIN_JD_CHARS) {
    throw new JobSourceError('no_content', `Please paste the full job description (at least ${MIN_JD_CHARS} characters).`)
  }
  return {
    platform: input.sourceUrl ? hostLabel(input.sourceUrl) : 'Manual',
    company: input.company.trim(),
    role: input.role.trim(),
    location: input.location?.trim() || null,
    ctcBand: jdText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*LPA/i)?.[0] ?? null,
    jdText,
    sourceUrl: input.sourceUrl?.trim() || '',
  }
}

function hostLabel(raw: string) {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '')
    return host.split('.')[0].replace(/\b\w/g, c => c.toUpperCase())
  } catch {
    return 'Manual'
  }
}

export function discoveryConfigured() {
  return jsearchConfigured() || adzunaConfigured()
}

/** Finds listings for each role/city pair from the licensed aggregators, de-duplicated by URL. */
export async function discoverJobs(roles: string[], cities: string[], limit: number): Promise<JobListing[]> {
  const seen = new Set<string>()
  const results: JobListing[] = []

  outer: for (const role of roles) {
    for (const city of cities) {
      const settled = await Promise.allSettled([searchJSearch(role, city, limit), searchAdzuna(role, city, limit)])
      for (const s of settled) {
        if (s.status === 'rejected') {
          console.warn('[jobs] discovery source failed:', (s.reason as Error)?.message)
          continue
        }
        for (const job of s.value) {
          const key = job.sourceUrl.split('?')[0]
          if (seen.has(key)) continue
          seen.add(key)
          results.push(job)
          if (results.length >= limit) break outer
        }
      }
    }
  }
  return results
}
