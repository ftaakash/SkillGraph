import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPrivateAddress, assertPublicUrl, safeFetchText } from '@/lib/jobs/http'
import { parseGreenhouseUrl, parseLeverUrl, parseAshbyUrl } from '@/lib/jobs/sources'
import { htmlToText, extractSkillsFromJD } from '@/lib/jobs/text'
import { resolveJobFromUrl, isRestrictedHost, listingFromPastedText } from '@/lib/jobs'

async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: { name?: string; code?: string }) => err.name === 'JobSourceError' && err.code === code)
}

test('isPrivateAddress flags internal, link-local and metadata ranges', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip)
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(ip), false, ip)
  }
})

test('assertPublicUrl blocks SSRF targets before any request is made', async () => {
  await rejectsWith(assertPublicUrl('http://169.254.169.254/latest/meta-data/'), 'blocked_address')
  await rejectsWith(assertPublicUrl('http://127.0.0.1/admin'), 'blocked_address')
  await rejectsWith(assertPublicUrl('http://[::1]/'), 'blocked_address')
  await rejectsWith(assertPublicUrl('http://8.8.8.8:8080/'), 'blocked_address')
  await rejectsWith(assertPublicUrl('file:///etc/passwd'), 'invalid_url')
  await rejectsWith(assertPublicUrl('https://user:pw@8.8.8.8/'), 'invalid_url')
  await rejectsWith(assertPublicUrl('not a url'), 'invalid_url')
  await rejectsWith(safeFetchText('http://10.0.0.5/'), 'blocked_address')
  assert.ok(await assertPublicUrl('https://8.8.8.8/jobs'))
})

test('restricted job boards are never fetched', async () => {
  for (const url of [
    'https://www.linkedin.com/jobs/view/123',
    'https://in.linkedin.com/jobs/view/1',
    'https://www.naukri.com/job-listings-x',
    'https://in.indeed.com/viewjob?jk=1',
    'https://www.glassdoor.co.in/job-listing/x',
  ]) {
    await rejectsWith(resolveJobFromUrl(url), 'unsupported_source')
  }
  assert.equal(isRestrictedHost('boards.greenhouse.io'), false)
  assert.equal(isRestrictedHost('notlinkedin.com'), false)
})

test('ATS URLs are parsed into API coordinates', () => {
  assert.deepEqual(parseGreenhouseUrl(new URL('https://boards.greenhouse.io/stripe/jobs/123456')), { board: 'stripe', id: '123456' })
  assert.deepEqual(parseGreenhouseUrl(new URL('https://job-boards.greenhouse.io/acme/jobs/42?gh_src=x')), { board: 'acme', id: '42' })
  assert.equal(parseGreenhouseUrl(new URL('https://example.com/acme/jobs/42')), null)
  const uuid = '0f4f1f7e-1111-2222-3333-444455556666'
  assert.deepEqual(parseLeverUrl(new URL(`https://jobs.lever.co/acme/${uuid}/apply`)), { company: 'acme', id: uuid, eu: false })
  assert.equal(parseLeverUrl(new URL(`https://jobs.eu.lever.co/acme/${uuid}`))?.eu, true)
  assert.deepEqual(parseAshbyUrl(new URL(`https://jobs.ashbyhq.com/ramp/${uuid}`)), { org: 'ramp', id: uuid })
})

test('htmlToText strips markup and scripts', () => {
  assert.equal(htmlToText('<p>Hello&nbsp;<b>world</b></p><script>alert(1)</script><ul><li>Go</li></ul>'), 'Hello world\n\n• Go')
  assert.equal(htmlToText('&lt;b&gt; &#39;x&#39; &#x41;'), "<b> 'x' A")
})

test('extractSkillsFromJD matches whole skills only', () => {
  assert.deepEqual(extractSkillsFromJD('We use Go, React and PostgreSQL. Good javascript.').sort(), ['go', 'javascript', 'postgresql', 'react'])
  assert.ok(!extractSkillsFromJD('A good team culture').includes('go'))
  assert.ok(!extractSkillsFromJD('javascript only').includes('java'))
})

test('pasted job descriptions are validated', () => {
  assert.throws(() => listingFromPastedText({ jdText: 'too short', company: 'A', role: 'B' }), { name: 'JobSourceError' })
  const listing = listingFromPastedText({ jdText: 'x'.repeat(250) + ' 12-18 LPA', company: ' Acme ', role: 'SDE', sourceUrl: 'https://www.linkedin.com/jobs/view/1' })
  assert.equal(listing.company, 'Acme')
  assert.equal(listing.platform, 'Linkedin')
  assert.equal(listing.ctcBand, '12-18 LPA')
})
