/**
 * Direct submission through employer ATS APIs (ADR-004).
 *
 * Greenhouse and Lever accept applications through their APIs only with the *employer's* API
 * key, so auto-submit works for employers who have authorised SkillGraph and whose key is in
 * ATS_PARTNER_KEYS. Every other job is prepared for the student to submit (extension or by hand).
 * SkillGraph never logs in to job sites or uses the student's accounts on them.
 *
 *   ATS_PARTNER_KEYS='{"greenhouse:acme":"<job board api key>","lever:acme":"<postings api key>"}'
 *
 * If the posting asks a required question we can't answer from the student's profile, nothing is
 * sent and the application is left for the student to review.
 */
import { parseGreenhouseUrl, parseLeverUrl } from '@/lib/jobs/sources'

const TIMEOUT_MS = 20_000

export interface Applicant {
  name: string
  email: string
  phone: string | null
  linkedin: string | null
  github: string | null
  college: string | null
}

export type SubmitResult =
  | { status: 'submitted'; externalRef: string | null }
  | { status: 'needs_review'; reason: string }
  | { status: 'not_supported' }

type Target = { ats: 'greenhouse'; board: string; jobId: string; key: string } | { ats: 'lever'; site: string; postingId: string; eu: boolean; key: string }

function partnerKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.ATS_PARTNER_KEYS || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    console.error('[openclaw/submit] ATS_PARTNER_KEYS is not valid JSON')
    return {}
  }
}

/** The partner ATS endpoint for a posting URL, or null if this employer hasn't authorised SkillGraph. */
export function submissionTarget(sourceUrl: string, keys = partnerKeys()): Target | null {
  let url: URL
  try {
    url = new URL(sourceUrl)
  } catch {
    return null
  }
  const gh = parseGreenhouseUrl(url)
  if (gh) {
    const key = keys[`greenhouse:${gh.board.toLowerCase()}`]
    return key ? { ats: 'greenhouse', board: gh.board, jobId: gh.id, key } : null
  }
  const lv = parseLeverUrl(url)
  if (lv) {
    const key = keys[`lever:${lv.company.toLowerCase()}`]
    return key ? { ats: 'lever', site: lv.company, postingId: lv.id, eu: lv.eu, key } : null
  }
  return null
}

export function splitName(full: string) {
  const parts = full.trim().split(/\s+/)
  return { first: parts[0] || full, last: parts.length > 1 ? parts.slice(1).join(' ') : '.' }
}

/** Answer for a standard or profile question, by field name or label; null when we don't know it. */
export function knownAnswer(name: string, label: string, a: Applicant): string | null {
  const key = `${name} ${label}`.toLowerCase()
  const { first, last } = splitName(a.name)
  if (/first_name|first name/.test(key)) return first
  if (/last_name|last name|surname/.test(key)) return last
  if (/\bemail\b/.test(key)) return a.email
  if (/phone|mobile/.test(key)) return a.phone
  if (/linkedin/.test(key)) return a.linkedin
  if (/github/.test(key)) return a.github
  if (/school|college|university/.test(key)) return a.college
  return null
}

// ─── Greenhouse Job Board API ───────────────────────────────────────────────
// GET  /v1/boards/{board}/jobs/{id}?questions=true  → the application form
// POST /v1/boards/{board}/jobs/{id}                  → submit (Basic auth with the board's API key)

type GreenhouseQuestion = { required?: boolean; label: string; fields: { name: string; type: string }[] }

async function submitGreenhouse(t: Extract<Target, { ats: 'greenhouse' }>, a: Applicant, resume: { bytes: Uint8Array; fileName: string }): Promise<SubmitResult> {
  const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t.board)}/jobs/${encodeURIComponent(t.jobId)}`
  const formRes = await fetch(`${base}?questions=true`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!formRes.ok) return { status: 'needs_review', reason: `Could not read the application form (HTTP ${formRes.status})` }
  const { questions = [] } = (await formRes.json()) as { questions?: GreenhouseQuestion[] }

  const form = new FormData()
  for (const q of questions) {
    for (const field of q.fields) {
      if (field.type === 'input_file') {
        if (field.name === 'resume') form.append('resume', new Blob([resume.bytes as BlobPart], { type: 'application/pdf' }), resume.fileName)
        else if (q.required) return { status: 'needs_review', reason: `The form requires “${q.label}”` }
        continue
      }
      const answer = knownAnswer(field.name, q.label, a)
      if (answer) form.append(field.name, answer)
      else if (q.required) return { status: 'needs_review', reason: `The form asks “${q.label}”, which needs your answer` }
    }
  }
  if (!form.has('resume')) form.append('resume', new Blob([resume.bytes as BlobPart], { type: 'application/pdf' }), resume.fileName)

  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${t.key}:`).toString('base64')}` },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body = (await res.json().catch(() => ({}))) as { id?: number | string; error?: string }
  if (!res.ok) return { status: 'needs_review', reason: `Greenhouse rejected the application: ${body.error ?? `HTTP ${res.status}`}` }
  return { status: 'submitted', externalRef: body.id != null ? String(body.id) : null }
}

// ─── Lever Postings API ─────────────────────────────────────────────────────
// GET  /v0/postings/{site}/{id}/apply?key=  → custom questions
// POST /v0/postings/{site}/{id}?key=        → submit

async function submitLever(t: Extract<Target, { ats: 'lever' }>, a: Applicant, resume: { bytes: Uint8Array; fileName: string }): Promise<SubmitResult> {
  const api = t.eu ? 'https://api.eu.lever.co' : 'https://api.lever.co'
  const base = `${api}/v0/postings/${encodeURIComponent(t.site)}/${encodeURIComponent(t.postingId)}`
  const key = `key=${encodeURIComponent(t.key)}`

  const formRes = await fetch(`${base}/apply?${key}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (formRes.ok) {
    const form = (await formRes.json()) as { customQuestions?: { fields?: { required?: boolean; text?: string }[] }[] }
    const required = (form.customQuestions ?? []).flatMap(q => q.fields ?? []).find(f => f.required)
    if (required) return { status: 'needs_review', reason: `The form asks “${required.text ?? 'a required question'}”, which needs your answer` }
  }

  const form = new FormData()
  form.append('name', a.name)
  form.append('email', a.email)
  if (a.phone) form.append('phone', a.phone)
  if (a.college) form.append('org', a.college)
  if (a.linkedin) form.append('urls[LinkedIn]', a.linkedin)
  if (a.github) form.append('urls[GitHub]', a.github)
  form.append('resume', new Blob([resume.bytes as BlobPart], { type: 'application/pdf' }), resume.fileName)

  const res = await fetch(`${base}?${key}`, { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT_MS) })
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; applicationId?: string; error?: string }
  if (!res.ok || body.ok === false) return { status: 'needs_review', reason: `Lever rejected the application: ${body.error ?? `HTTP ${res.status}`}` }
  return { status: 'submitted', externalRef: body.applicationId ?? null }
}

/** Submits through the employer's ATS when they've authorised SkillGraph; otherwise not_supported. */
export async function submitThroughAts(sourceUrl: string, applicant: Applicant, resume: { bytes: Uint8Array; fileName: string }): Promise<SubmitResult> {
  const target = submissionTarget(sourceUrl)
  if (!target) return { status: 'not_supported' }
  try {
    return target.ats === 'greenhouse' ? await submitGreenhouse(target, applicant, resume) : await submitLever(target, applicant, resume)
  } catch (err) {
    return { status: 'needs_review', reason: `Could not reach the employer’s application system: ${(err as Error).message}` }
  }
}
