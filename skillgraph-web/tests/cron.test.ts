import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { NextRequest } from 'next/server'
import { requireCronSecret } from '@/lib/cron'
import { currentDemandWeek } from '@/lib/scheduled'

const req = (headers: Record<string, string>) => new NextRequest('http://localhost/api/cron/billing', { headers })

test('cron calls need CRON_SECRET, from Vercel Cron or an external scheduler', () => {
  const previous = process.env.CRON_SECRET
  try {
    delete process.env.CRON_SECRET
    // Fails closed when the secret isn't configured
    assert.equal(requireCronSecret(req({ authorization: 'Bearer anything' }))?.status, 401)

    process.env.CRON_SECRET = 's3cret-value'
    assert.equal(requireCronSecret(req({ authorization: 'Bearer s3cret-value' })), null) // Vercel Cron
    assert.equal(requireCronSecret(req({ 'x-cron-secret': 's3cret-value' })), null) // external scheduler
    assert.equal(requireCronSecret(req({ authorization: 'Bearer wrong' }))?.status, 401)
    assert.equal(requireCronSecret(req({ authorization: 's3cret-value' }))?.status, 401) // missing "Bearer "
    assert.equal(requireCronSecret(req({}))?.status, 401)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

test('every Vercel cron schedule fits the Hobby plan (at most once a day) and targets a known job', () => {
  const { crons } = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: { path: string; schedule: string }[] }
  const route = readFileSync('app/api/cron/[job]/route.ts', 'utf8')
  for (const { path, schedule } of crons) {
    const [minute, hour] = schedule.split(' ')
    assert.match(minute, /^\d+$/, `${path}: minute must be fixed (${schedule})`)
    assert.match(hour, /^\d+$/, `${path}: hour must be fixed (${schedule})`)
    const job = path.replace('/api/cron/', '')
    assert.ok(route.includes(`'${job}'`) || route.includes(`  ${job}:`), `${path} is not a job in the cron route`)
  }
})

test('market data weeks advance weekly', () => {
  assert.equal(currentDemandWeek(new Date(2026, 0, 1)), 1)
  assert.ok(currentDemandWeek(new Date(2026, 9, 14)) > currentDemandWeek(new Date(2026, 9, 1)))
})
