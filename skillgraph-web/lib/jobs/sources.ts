/**
 * Job sources that SkillGraph is permitted to read programmatically:
 *  - Public job-board APIs published by ATS vendors (Greenhouse, Lever, Ashby)
 *  - Licensed aggregator APIs (JSearch via RapidAPI, Adzuna) for discovery
 */
import { fetchJson } from './http'
import { htmlToText } from './text'
import { JobSourceError, type JobListing } from './types'

const titleCase = (slug: string) => slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ─── Greenhouse ─────────────────────────────────────────────────────────────
// boards.greenhouse.io/{board}/jobs/{id}  |  job-boards.greenhouse.io/{board}/jobs/{id}

export function parseGreenhouseUrl(url: URL) {
  if (!/(^|\.)greenhouse\.io$/.test(url.hostname)) return null
  const m = url.pathname.match(/^\/([\w-]+)\/jobs\/(\d+)/)
  const board = m?.[1] ?? url.searchParams.get('for')
  const id = m?.[2] ?? url.searchParams.get('gh_jid') ?? url.searchParams.get('token')
  return board && id ? { board, id } : null
}

export async function fetchGreenhouseJob(board: string, id: string, sourceUrl: string): Promise<JobListing> {
  const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}`
  const [job, meta] = await Promise.all([
    fetchJson<{ title: string; location?: { name?: string }; content?: string; absolute_url?: string }>(
      `${base}/jobs/${encodeURIComponent(id)}`
    ),
    fetchJson<{ name?: string }>(base).catch(() => ({ name: undefined })),
  ])
  // Greenhouse returns entity-escaped HTML: decode once, then strip tags
  const jdText = htmlToText(htmlToText(job.content ?? ''))
  return {
    platform: 'Greenhouse',
    company: meta.name || titleCase(board),
    role: job.title.trim(),
    location: job.location?.name ?? null,
    ctcBand: null,
    jdText,
    sourceUrl: job.absolute_url ?? sourceUrl,
  }
}

// ─── Lever ──────────────────────────────────────────────────────────────────
// jobs.lever.co/{company}/{uuid}  |  jobs.eu.lever.co/{company}/{uuid}

export function parseLeverUrl(url: URL) {
  const m = url.hostname.match(/^jobs\.(eu\.)?lever\.co$/)
  if (!m) return null
  const p = url.pathname.match(/^\/([\w.-]+)\/([0-9a-f-]{36})/i)
  return p ? { company: p[1], id: p[2], eu: Boolean(m[1]) } : null
}

export async function fetchLeverJob(company: string, id: string, eu: boolean, sourceUrl: string): Promise<JobListing> {
  const api = eu ? 'https://api.eu.lever.co' : 'https://api.lever.co'
  const job = await fetchJson<{
    text: string
    categories?: { location?: string }
    descriptionPlain?: string
    lists?: { text: string; content: string }[]
    additionalPlain?: string
    hostedUrl?: string
    salaryRange?: { min?: number; max?: number; currency?: string }
  }>(`${api}/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(id)}`)

  const lists = (job.lists ?? []).map(l => `${l.text}\n${htmlToText(l.content)}`).join('\n\n')
  const salary = job.salaryRange?.min
    ? `${job.salaryRange.min}-${job.salaryRange.max ?? ''} ${job.salaryRange.currency ?? ''}`.trim()
    : null
  return {
    platform: 'Lever',
    company: titleCase(company),
    role: job.text.trim(),
    location: job.categories?.location ?? null,
    ctcBand: salary,
    jdText: [job.descriptionPlain, lists, job.additionalPlain].filter(Boolean).join('\n\n').trim(),
    sourceUrl: job.hostedUrl ?? sourceUrl,
  }
}

// ─── Ashby ──────────────────────────────────────────────────────────────────
// jobs.ashbyhq.com/{org}/{jobId}

export function parseAshbyUrl(url: URL) {
  if (url.hostname !== 'jobs.ashbyhq.com') return null
  const p = url.pathname.match(/^\/([\w.%-]+)\/([0-9a-f-]{36})/i)
  return p ? { org: decodeURIComponent(p[1]), id: p[2] } : null
}

export async function fetchAshbyJob(org: string, id: string, sourceUrl: string): Promise<JobListing> {
  const board = await fetchJson<{
    jobs?: {
      id: string
      title: string
      location?: string
      descriptionPlain?: string
      descriptionHtml?: string
      jobUrl?: string
      compensation?: { compensationTierSummary?: string }
    }[]
  }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}?includeCompensation=true`)

  const job = board.jobs?.find(j => j.id === id)
  if (!job) throw new JobSourceError('not_found', 'This Ashby posting is no longer listed.')
  return {
    platform: 'Ashby',
    company: titleCase(org),
    role: job.title.trim(),
    location: job.location ?? null,
    ctcBand: job.compensation?.compensationTierSummary ?? null,
    jdText: job.descriptionPlain ?? htmlToText(job.descriptionHtml ?? ''),
    sourceUrl: job.jobUrl ?? sourceUrl,
  }
}

// ─── Discovery: JSearch (RapidAPI) ──────────────────────────────────────────

export function jsearchConfigured() {
  return Boolean(process.env.RAPIDAPI_KEY)
}

export async function searchJSearch(role: string, city: string, limit = 10): Promise<JobListing[]> {
  if (!jsearchConfigured()) return []
  const host = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com'
  const query = city && city.toLowerCase() !== 'remote' ? `${role} in ${city}` : `${role} remote`
  const params = new URLSearchParams({ query, page: '1', num_pages: '1', country: 'in' })
  if (city.toLowerCase() === 'remote') params.set('remote_jobs_only', 'true')

  const body = await fetchJson<{
    data?: {
      job_title?: string
      employer_name?: string
      job_city?: string
      job_state?: string
      job_is_remote?: boolean
      job_description?: string
      job_apply_link?: string
      job_min_salary?: number | null
      job_max_salary?: number | null
      job_salary_currency?: string | null
      job_salary_period?: string | null
    }[]
  }>(`https://${host}/search?${params}`, {
    headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY!, 'x-rapidapi-host': host },
  })

  return (body.data ?? [])
    .filter(j => j.job_apply_link && j.employer_name && j.job_title && j.job_description)
    .slice(0, limit)
    .map(j => ({
      platform: 'JSearch',
      company: j.employer_name!,
      role: j.job_title!,
      location: j.job_is_remote ? 'Remote' : [j.job_city, j.job_state].filter(Boolean).join(', ') || null,
      ctcBand: j.job_min_salary
        ? `${j.job_min_salary}-${j.job_max_salary ?? ''} ${j.job_salary_currency ?? ''}${j.job_salary_period ? `/${j.job_salary_period.toLowerCase()}` : ''}`.trim()
        : null,
      jdText: j.job_description!.slice(0, 8000),
      sourceUrl: j.job_apply_link!,
    }))
}

// ─── Discovery: Adzuna (optional) ───────────────────────────────────────────

export function adzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
}

export async function searchAdzuna(role: string, city: string, limit = 10): Promise<JobListing[]> {
  if (!adzunaConfigured()) return []
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: role,
    results_per_page: String(Math.min(limit, 50)),
    'content-type': 'application/json',
  })
  if (city && city.toLowerCase() !== 'remote') params.set('where', city)
  const country = process.env.ADZUNA_COUNTRY || 'in'

  const body = await fetchJson<{
    results?: {
      title?: string
      company?: { display_name?: string }
      location?: { display_name?: string }
      description?: string
      redirect_url?: string
      salary_min?: number
      salary_max?: number
    }[]
  }>(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`)

  return (body.results ?? [])
    .filter(j => j.redirect_url && j.title && j.company?.display_name)
    .map(j => ({
      platform: 'Adzuna',
      company: j.company!.display_name!,
      role: htmlToText(j.title!),
      location: j.location?.display_name ?? null,
      ctcBand: j.salary_min ? `${Math.round(j.salary_min)}-${Math.round(j.salary_max ?? j.salary_min)}/yr` : null,
      jdText: htmlToText(j.description ?? ''),
      sourceUrl: j.redirect_url!,
    }))
}
