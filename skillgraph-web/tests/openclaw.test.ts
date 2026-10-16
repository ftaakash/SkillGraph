import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkFilters, maxCtcLpa, filtersFromConfig, type JobFilters } from '@/lib/openclaw/filters'
import { submissionTarget, knownAnswer, splitName, type Applicant } from '@/lib/openclaw/submit'
import { resumeFileName } from '@/lib/resume/tailor'
import { parseTailoringNotes, submittedViaLabel, statusLabel, recommendationLabel } from '@/components/openclaw/labels'

test('pipeline notes: JSON evaluations, the agent\'s advice, and why a job was not auto-submitted', () => {
  assert.equal(parseTailoringNotes('{"grade":"B","recommendation":"ReviewAndApply"}').evaluation?.grade, 'B')
  assert.deepEqual(parseTailoringNotes('Lead with your React project.\n\nNot auto-submitted: The form asks “Expected CTC”, which needs your answer'), {
    evaluation: null,
    advice: 'Lead with your React project.',
    notSubmittedReason: 'The form asks “Expected CTC”, which needs your answer',
  })
  assert.deepEqual(parseTailoringNotes('Not auto-submitted: Greenhouse rejected the application: HTTP 422'), {
    evaluation: null, advice: null, notSubmittedReason: 'Greenhouse rejected the application: HTTP 422',
  })
  assert.deepEqual(parseTailoringNotes(null), { evaluation: null, advice: null, notSubmittedReason: null })
  assert.equal(submittedViaLabel('ats_api'), 'Submitted for you')
  assert.equal(submittedViaLabel(null), null)
  assert.equal(statusLabel('ReadyToApply'), 'Ready to apply')
  assert.equal(recommendationLabel('AutoApply'), 'Strong match: apply')
})

const filters: JobFilters = {
  targetRoles: ['Full Stack Developer', 'SDE'],
  preferredCities: ['Bengaluru', 'Remote'],
  minCtcLpa: 6,
  blacklistedCompanies: ['Shady Corp'],
  includeKeywords: ['React', 'Node'],
  excludeKeywords: ['5+ years'],
}

const job = {
  company: 'Acme',
  role: 'Full Stack Developer I',
  location: 'Bengaluru, Karnataka',
  ctcBand: '8-12 LPA',
  jdText: 'Build React interfaces and Node.js APIs. Freshers welcome.',
}

test('a job inside every filter passes, with readable reasons', () => {
  const v = checkFilters(job, filters)
  assert.equal(v.ok, true)
  assert.ok(v.reasons.some(r => r.includes('Full Stack Developer')))
})

test('each filter can reject a job on its own', () => {
  assert.equal(checkFilters({ ...job, company: 'Shady Corp Pvt Ltd' }, filters).ok, false)
  assert.equal(checkFilters({ ...job, role: 'Data Analyst' }, filters).ok, false)
  assert.equal(checkFilters({ ...job, location: 'Pune' }, filters).ok, false)
  assert.equal(checkFilters({ ...job, ctcBand: '3-4 LPA' }, filters).ok, false)
  assert.equal(checkFilters({ ...job, jdText: 'Angular and Java only' }, filters).ok, false)
  assert.equal(checkFilters({ ...job, jdText: 'React and Node, 5+ years required' }, filters).ok, false)
})

test('remote roles pass when the student accepts remote; unknown pay and location are not held against a job', () => {
  assert.equal(checkFilters({ ...job, location: 'Remote (India)' }, filters).ok, true)
  assert.equal(checkFilters({ ...job, location: null, ctcBand: null }, filters).ok, true)
  // "SDE" matches "SDE II" by its distinctive word
  assert.equal(checkFilters({ ...job, role: 'SDE II' }, filters).ok, true)
})

test('empty filters accept everything', () => {
  const none = filtersFromConfig({ targetRoles: [], preferredCities: [], minCtcLpa: 0, blacklistedCompanies: [] })
  assert.equal(checkFilters({ ...job, role: 'Anything' }, none).ok, true)
})

test('pay bands are read in lakhs per annum', () => {
  assert.equal(maxCtcLpa('8-12 LPA'), 12)
  assert.equal(maxCtcLpa('₹6,00,000 - ₹9,00,000'), 9)
  assert.equal(maxCtcLpa('1200000-1800000 INR'), 18)
  assert.equal(maxCtcLpa('12 lakhs'), 12)
  assert.equal(maxCtcLpa('$120,000 - $150,000'), null)
  assert.equal(maxCtcLpa('Not disclosed'), null)
  // As shown on live Naukri and Glassdoor pages
  assert.equal(maxCtcLpa('6.5-7 Lacs P.A.'), 7)
  assert.equal(maxCtcLpa('₹7,195.34 - ₹14,390.68 Per hour (Employer provided)'), null)
  assert.equal(maxCtcLpa('₹40,000 - ₹50,000 per month'), 6)
  assert.equal(maxCtcLpa('₹500,000.00/yr - ₹1,000,000.00/yr'), 10)
  assert.equal(maxCtcLpa(null), null)
})

test('ATS auto-submit is only possible for employers that authorised SkillGraph', () => {
  const keys = { 'greenhouse:acme': 'gh-key', 'lever:globex': 'lv-key' }
  assert.deepEqual(submissionTarget('https://boards.greenhouse.io/acme/jobs/123', keys), { ats: 'greenhouse', board: 'acme', jobId: '123', key: 'gh-key' })
  assert.equal(submissionTarget('https://jobs.lever.co/globex/0f0e1c2d-1111-2222-3333-444455556666', keys)?.ats, 'lever')
  assert.equal(submissionTarget('https://boards.greenhouse.io/other/jobs/1', keys), null)
  assert.equal(submissionTarget('https://www.linkedin.com/jobs/view/123', keys), null)
  assert.equal(submissionTarget('not a url', keys), null)
})

test('form questions are answered only from the profile; anything else is left to the student', () => {
  const a: Applicant = { name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210', linkedin: 'https://linkedin.com/in/asha', github: null, college: 'SRM' }
  assert.equal(knownAnswer('first_name', 'First Name', a), 'Asha')
  assert.equal(knownAnswer('last_name', 'Last Name', a), 'Rao')
  assert.equal(knownAnswer('question_1', 'LinkedIn Profile', a), 'https://linkedin.com/in/asha')
  assert.equal(knownAnswer('question_2', 'GitHub', a), null)
  assert.equal(knownAnswer('question_3', 'What is your expected CTC?', a), null)
  assert.deepEqual(splitName('Madonna'), { first: 'Madonna', last: '.' })
})

test('tailored résumé file names are safe for upload fields', () => {
  assert.equal(resumeFileName('Asha Rao', 'Acme, Inc.'), 'Asha_Rao_Resume_Acme_Inc.pdf')
  assert.equal(resumeFileName(null, '!!!'), 'Resume_Resume_Job.pdf')
})

test('Greenhouse submission sends the profile and résumé, and stops at questions only the student can answer', async () => {
  const realFetch = globalThis.fetch
  process.env.ATS_PARTNER_KEYS = JSON.stringify({ 'greenhouse:acme': 'gh-key' })
  const applicant: Applicant = { name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210', linkedin: null, github: null, college: null }
  const resume = { bytes: new TextEncoder().encode('%PDF-1.3'), fileName: 'Asha_Rao_Resume_Acme.pdf' }
  let questions: unknown[] = []
  let posted: { auth: string | null; form: FormData } | null = null
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted = { auth: new Headers(init.headers).get('authorization'), form: init.body as FormData }
      return new Response(JSON.stringify({ id: 987 }), { status: 200 })
    }
    return new Response(JSON.stringify({ questions }), { status: 200 })
  }) as typeof fetch
  try {
    const { submitThroughAts } = await import('@/lib/openclaw/submit')
    questions = [
      { required: true, label: 'First Name', fields: [{ name: 'first_name', type: 'input_text' }] },
      { required: true, label: 'Email', fields: [{ name: 'email', type: 'input_text' }] },
      { required: true, label: 'Resume', fields: [{ name: 'resume', type: 'input_file' }] },
      { required: false, label: 'LinkedIn', fields: [{ name: 'question_1', type: 'input_text' }] },
    ]
    const ok = await submitThroughAts('https://boards.greenhouse.io/acme/jobs/42', applicant, resume)
    assert.deepEqual(ok, { status: 'submitted', externalRef: '987' })
    assert.equal(posted!.auth, `Basic ${Buffer.from('gh-key:').toString('base64')}`)
    assert.equal(posted!.form.get('first_name'), 'Asha')
    assert.equal(posted!.form.get('email'), 'asha@example.com')
    assert.equal((posted!.form.get('resume') as File).name, 'Asha_Rao_Resume_Acme.pdf')
    assert.equal(posted!.form.has('question_1'), false)

    posted = null
    questions = [{ required: true, label: 'Expected CTC', fields: [{ name: 'question_2', type: 'input_text' }] }]
    const held = await submitThroughAts('https://boards.greenhouse.io/acme/jobs/42', applicant, resume)
    assert.equal(held.status, 'needs_review')
    assert.equal(posted, null)

    assert.deepEqual(await submitThroughAts('https://www.naukri.com/job-listings-1', applicant, resume), { status: 'not_supported' })
  } finally {
    globalThis.fetch = realFetch
    delete process.env.ATS_PARTNER_KEYS
  }
})
