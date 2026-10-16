/**
 * The student's OpenClaw job filters (ADR-004). One pure function decides whether a job is in
 * scope, shared by the nightly agent, the evaluation pipeline and the browser extension, so a
 * job is never prepared or submitted outside what the student asked for.
 */
import type { JobListing } from '@/lib/jobs'

export interface JobFilters {
  targetRoles: string[]
  preferredCities: string[]
  minCtcLpa: number
  blacklistedCompanies: string[]
  includeKeywords: string[]
  excludeKeywords: string[]
}

export type FilterVerdict = { ok: true; reasons: string[] } | { ok: false; reasons: string[] }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

const ROLE_STOPWORDS = new Set(['engineer', 'developer', 'senior', 'junior', 'associate', 'intern', 'and', 'the', 'of', 'i', 'ii', 'iii', 'sr', 'jr'])
const REMOTE = /\b(remote|work from home|wfh|anywhere)\b/i

export function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map(s => s.trim()).filter(Boolean) : []
}

/** Reads filters from an OpenClawConfig row (JSON columns hold string arrays). */
export function filtersFromConfig(config: {
  targetRoles: unknown; preferredCities: unknown; minCtcLpa: number; blacklistedCompanies: unknown
  includeKeywords?: unknown; excludeKeywords?: unknown
}): JobFilters {
  return {
    targetRoles: asList(config.targetRoles),
    preferredCities: asList(config.preferredCities),
    minCtcLpa: config.minCtcLpa,
    blacklistedCompanies: asList(config.blacklistedCompanies),
    includeKeywords: asList(config.includeKeywords),
    excludeKeywords: asList(config.excludeKeywords),
  }
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether `text` contains `term` as a whole word or phrase: "Java" doesn't match "JavaScript",
 * "AI" doesn't match "maintain". Terms ending in symbols ("C++", "Node.js", "5+ years") still match.
 */
export function containsTerm(text: string, term: string): boolean {
  const t = norm(term)
  if (!t) return false
  const start = /^[a-z0-9]/.test(t) ? '(?<![a-z0-9])' : ''
  const end = /[a-z0-9]$/.test(t) ? '(?![a-z0-9])' : ''
  return new RegExp(`${start}${escapeRegex(t)}${end}`).test(norm(text))
}

/** A role matches when the title contains the whole target, or all its distinctive words. */
function roleMatches(title: string, target: string) {
  if (containsTerm(title, target)) return true
  const words = norm(target).split(/[^a-z0-9+#.]+/).filter(w => w && !ROLE_STOPWORDS.has(w))
  return words.length > 0 && words.every(w => containsTerm(title, w))
}

/**
 * Upper end of a CTC band in lakhs per annum, or null if it can't be read.
 * Understands "8-12 LPA", "6.5-7 Lacs P.A.", "12 lakhs", "₹6,00,000 - ₹9,00,000", "1200000-1800000 INR"
 * monthly amounts ("₹40,000 - ₹50,000 per month", "60,000 a month") and thousands written as
 * "25k". Hourly pay returns null.
 */
export function maxCtcLpa(band: string | null): number | null {
  if (!band) return null
  const text = band.toLowerCase().replace(/,/g, '')
  // Foreign-currency bands can't be compared with a rupee minimum
  if (/[$€£]|\b(usd|eur|gbp|aud|cad|sgd)\b/.test(text)) return null
  // Hourly pay (Glassdoor shows some roles this way) can't be compared with an annual CTC
  if (/per hour|hourly|an hour|\/\s*h(ou)?r\b/.test(text)) return null
  const monthly = /per month|a month|monthly|per mensem|\/\s*mo(nth)?\b|\bp\.?m\.?(\s|$)/.test(text)
  // "25k" / "25 K" are thousands
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(k\b)?/g)].map(m => Number(m[1]) * (m[2] ? 1000 : 1)).filter(n => n > 0)
  if (nums.length === 0) return null
  const max = Math.max(...nums)
  if (/lpa|lakh|lac|\bl\b/.test(text) || max < 200) return monthly ? max * 12 : max
  if (max < 10_000) return null
  return Math.round(((monthly ? max * 12 : max) / 100_000) * 100) / 100
}

export function checkFilters(job: Pick<JobListing, 'company' | 'role' | 'location' | 'ctcBand' | 'jdText'>, f: JobFilters): FilterVerdict {
  const fail: string[] = []
  const pass: string[] = []
  const haystack = norm(`${job.role}\n${job.jdText}`)

  const blocked = f.blacklistedCompanies.find(c => containsTerm(job.company, c))
  if (blocked) fail.push(`${job.company} is on your blocked companies list`)

  if (f.targetRoles.length > 0) {
    const role = f.targetRoles.find(r => roleMatches(job.role, r))
    if (role) pass.push(`Role matches “${role}”`)
    else fail.push(`“${job.role}” doesn’t match your target roles (${f.targetRoles.join(', ')})`)
  }

  if (f.preferredCities.length > 0 && job.location) {
    const wantsRemote = f.preferredCities.some(c => REMOTE.test(c))
    const city = f.preferredCities.find(c => !REMOTE.test(c) && containsTerm(job.location!, c))
    if (city) pass.push(`Location matches ${city}`)
    else if (wantsRemote && REMOTE.test(job.location)) pass.push('Remote role')
    else fail.push(`${job.location} isn’t one of your cities (${f.preferredCities.join(', ')})`)
  }

  const ctc = maxCtcLpa(job.ctcBand)
  if (ctc !== null && f.minCtcLpa > 0) {
    if (ctc < f.minCtcLpa) fail.push(`Pays up to ₹${ctc} LPA, below your minimum of ₹${f.minCtcLpa} LPA`)
    else pass.push(`Pays up to ₹${ctc} LPA`)
  }

  const excluded = f.excludeKeywords.find(k => containsTerm(haystack, k))
  if (excluded) fail.push(`Mentions “${excluded}”, which you excluded`)

  if (f.includeKeywords.length > 0) {
    const hit = f.includeKeywords.find(k => containsTerm(haystack, k))
    if (hit) pass.push(`Mentions “${hit}”`)
    else fail.push(`Mentions none of your keywords (${f.includeKeywords.join(', ')})`)
  }

  return fail.length > 0 ? { ok: false, reasons: fail } : { ok: true, reasons: pass }
}
