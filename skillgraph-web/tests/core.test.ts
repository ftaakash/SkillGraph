import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractJson, dailyTokenLimit, aiErrorResponse, AiError } from '@/lib/ai'
import { gapAnalysisSchema, sprintSchema, resumeParseSchema, jobMatchSchema, dimensionScoreSchema, projectSuggestionsSchema } from '@/lib/ai/schemas'
import { checkRateLimit, clientIp } from '@/lib/rateLimit'
import { presentStudent, anonymousLabel } from '@/lib/talent'
import { hashToken } from '@/lib/authTokens'
import { studentRegisterSchema, recruiterRegisterSchema, firstIssue } from '@/lib/validation/auth'
import { USER_SETTABLE_STATUSES, APPLICATION_STATUSES } from '@/lib/openclaw/status'
import { putPrivateFile, getFileAccess, deletePrivateFile } from '@/lib/storage'
import { escapeHtml } from '@/lib/email'

// ─── AI output handling ──────────────────────────────────────────────────────

test('extractJson tolerates fences and surrounding prose', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(extractJson('Sure! Here it is: [1,2] Hope that helps'), [1, 2])
  assert.throws(() => extractJson('no json here'))
})

test('AI schemas coerce formatting but enforce shape', () => {
  const gap = gapAnalysisSchema.parse({ readiness_percentage: '72', missing_skills: [{ skill: 'Docker', urgency: 'URGENT', weeks_to_learn: '3' }] })
  assert.equal(gap.readiness_percentage, 72)
  assert.equal(gap.missing_skills[0].urgency, 'medium')
  assert.equal(gap.missing_skills[0].weeks_to_learn, 3)
  assert.deepEqual(gap.strengths, [])
  assert.equal(gapAnalysisSchema.parse({ readiness_percentage: 400 }).readiness_percentage, 0)

  const day = (d: number) => ({ day: d, focus: 'f', topic: 't', resource_type: 'video', resource_title: 'r', resource_url: 'https://x', time_minutes: 30, mini_task: 'm', checkpoint: 'c' })
  assert.equal(sprintSchema.safeParse([1, 2, 3, 4, 5, 6, 7].map(day)).success, true)
  assert.equal(sprintSchema.safeParse([1, 2, 3].map(day)).success, false)

  assert.deepEqual(resumeParseSchema.parse({ technical_skills: ['Go'], tools: 'oops' }).tools, [])
  assert.equal(projectSuggestionsSchema.safeParse([]).success, false)

  assert.equal(jobMatchSchema.parse({ applyRecommendation: 'false' }).applyRecommendation, false)
  assert.equal(jobMatchSchema.parse({ applyRecommendation: true }).applyRecommendation, true)
  assert.equal(dimensionScoreSchema(10).parse({ score: 42 }).score, 10)
  assert.equal(dimensionScoreSchema(10).parse({ score: -3 }).score, 0)
})

test('AI errors map to safe user-facing responses', () => {
  assert.equal(aiErrorResponse(new AiError('quota_exceeded', 'internal detail')).status, 429)
  assert.equal(aiErrorResponse(new AiError('invalid_output', 'x')).status, 502)
  assert.ok(!aiErrorResponse(new AiError('upstream', 'secret upstream message')).error.includes('secret'))
  assert.ok(dailyTokenLimit() > 0)
})

// ─── Rate limiting ───────────────────────────────────────────────────────────

test('rate limiter blocks the 11th auth attempt per client only', async () => {
  let last
  for (let i = 0; i < 11; i++) last = await checkRateLimit('POST', '/api/auth/password/forgot', 'ip:test-a')
  assert.equal(last?.limited, true)
  assert.equal((await checkRateLimit('POST', '/api/auth/password/forgot', 'ip:test-b')).limited, false)
  assert.equal((await checkRateLimit('GET', '/api/auth/session', 'ip:test-a')).limited, false)
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4')
})

test('bulk AI runs and paid job-search lookups are rate limited', async () => {
  let last
  for (let i = 0; i < 7; i++) last = await checkRateLimit('POST', '/api/openclaw/batch', 'user:bulk')
  assert.equal(last?.limited, true)
  // batch and trigger share one bucket
  assert.equal((await checkRateLimit('POST', '/api/openclaw/trigger', 'user:bulk')).limited, true)
  for (let i = 0; i < 61; i++) last = await checkRateLimit('GET', '/api/market/search', 'user:market')
  assert.equal(last?.limited, true)
  assert.equal((await checkRateLimit('GET', '/api/market/india', 'user:market')).limited, false)
})

// ─── Consent-based identity reveal ───────────────────────────────────────────

const student = {
  id: 'ckabcdef123', name: 'Asha Rao', email: 'asha@example.com', college: 'IIT X', branch: 'CSE', year: '4th',
  readinessScore: 81, targetRole: 'SDE', linkedin: 'https://linkedin.com/in/asha', github: null,
}

test('recruiters never see identity without the student accepting', () => {
  for (const status of ['none', 'requested', 'declined']) {
    const shown = presentStudent(student, status)
    assert.equal(shown.name, anonymousLabel(student.id))
    assert.equal(shown.email, null)
    assert.equal(shown.college, null)
    assert.equal(shown.linkedin, null)
    assert.equal(shown.revealed, false)
    assert.equal(shown.readinessScore, 81)
  }
  const accepted = presentStudent(student, 'accepted')
  assert.equal(accepted.name, 'Asha Rao')
  assert.equal(accepted.email, 'asha@example.com')
  assert.equal(accepted.revealed, true)
})

// ─── Accounts & validation ───────────────────────────────────────────────────

test('auth tokens are stored only as SHA-256 hashes', () => {
  const hash = hashToken('abc')
  assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.notEqual(hashToken('abd'), hash)
})

test('registration requires consent, a strong password, and normalises email', () => {
  const base = { name: 'Asha', email: '  Asha@Example.COM ', password: 'longenough', acceptTerms: true }
  const parsed = studentRegisterSchema.parse(base)
  assert.equal(parsed.email, 'asha@example.com')

  const noConsent = studentRegisterSchema.safeParse({ ...base, acceptTerms: false })
  assert.equal(noConsent.success, false)
  if (!noConsent.success) assert.match(firstIssue(noConsent.error), /Terms of Service/)

  assert.equal(studentRegisterSchema.safeParse({ ...base, password: 'short' }).success, false)
  assert.equal(studentRegisterSchema.safeParse({ ...base, role: 'RECRUITER' }).success, false)
  assert.equal(recruiterRegisterSchema.safeParse({ ...base, companyName: 'Acme' }).success, true)
})

test('students can only set lifecycle statuses, never system ones', () => {
  const settable: readonly string[] = USER_SETTABLE_STATUSES
  for (const s of ['Pending', 'ReadyToApply', 'Duplicate', 'Failed']) assert.ok(!settable.includes(s), s)
  for (const s of USER_SETTABLE_STATUSES) assert.ok((APPLICATION_STATUSES as readonly string[]).includes(s))
})

test('escapeHtml neutralises markup in emails', () => {
  assert.equal(escapeHtml(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;')
})

// ─── Storage ─────────────────────────────────────────────────────────────────

test('private storage round-trips locally and rejects unsafe names', async () => {
  const ref = await putPrivateFile('resumes', `test_${Date.now()}.pdf`, new TextEncoder().encode('%PDF-test'))
  assert.match(ref, /^local:resumes\//)
  const access = await getFileAccess(ref)
  assert.equal(access?.kind, 'buffer')
  assert.equal(await deletePrivateFile(ref), true)
  assert.equal(await getFileAccess(ref), null)

  for (const bad of ['../evil.pdf', '.hidden', 'a/b.pdf', 'x y.pdf']) {
    await assert.rejects(putPrivateFile('resumes', bad, new Uint8Array([1])), /Invalid file name/, bad)
  }
  assert.equal(await getFileAccess('/resumes/../../.env'), null)
})
