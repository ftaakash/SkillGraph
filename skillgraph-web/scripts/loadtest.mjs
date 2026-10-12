#!/usr/bin/env node
/**
 * Dependency-free HTTP load test (ADR-001 Phase 4).
 *
 *   node scripts/loadtest.mjs --base http://localhost:3000 --paths /api/health,/api/stats \
 *        --concurrency 20 --duration 15 [--cookie "authjs.session-token=…"]
 *
 * Run it against a production build (`npm run build && npm start`) and a staging database —
 * never against production. Reports throughput, latency percentiles and status codes per path.
 */
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:3000' },
    paths: { type: 'string', default: '/api/health,/api/stats,/' },
    concurrency: { type: 'string', default: '20' },
    duration: { type: 'string', default: '15' },
    cookie: { type: 'string' },
    'max-p95': { type: 'string' },
    'max-error-rate': { type: 'string', default: '0.01' },
  },
})

const base = values.base.replace(/\/$/, '')
const paths = values.paths.split(',').map(p => p.trim()).filter(Boolean)
const concurrency = Math.max(1, Number(values.concurrency))
const durationMs = Math.max(1, Number(values.duration)) * 1000
const headers = { 'User-Agent': 'skillgraph-loadtest/1.0', ...(values.cookie ? { Cookie: values.cookie } : {}) }

const results = new Map(paths.map(p => [p, { latencies: [], statuses: new Map(), errors: 0 }]))
let index = 0
const deadline = Date.now() + durationMs

async function worker() {
  while (Date.now() < deadline) {
    const path = paths[index++ % paths.length]
    const r = results.get(path)
    const started = performance.now()
    try {
      const res = await fetch(base + path, { headers, redirect: 'manual', signal: AbortSignal.timeout(30_000) })
      await res.arrayBuffer()
      r.latencies.push(performance.now() - started)
      r.statuses.set(res.status, (r.statuses.get(res.status) ?? 0) + 1)
    } catch {
      r.errors++
    }
  }
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0)
const fmt = ms => `${ms.toFixed(0)}ms`

console.log(`Load test: ${base}  paths=${paths.join(', ')}  concurrency=${concurrency}  duration=${durationMs / 1000}s\n`)
const t0 = performance.now()
await Promise.all(Array.from({ length: concurrency }, worker))
const elapsed = (performance.now() - t0) / 1000

let total = 0, failures = 0, worstP95 = 0
const rows = []
for (const [path, r] of results) {
  const sorted = [...r.latencies].sort((a, b) => a - b)
  const count = sorted.length + r.errors
  const bad = r.errors + [...r.statuses].filter(([s]) => s >= 500).reduce((n, [, c]) => n + c, 0)
  total += count
  failures += bad
  worstP95 = Math.max(worstP95, pct(sorted, 95))
  rows.push({
    path,
    requests: count,
    'req/s': (count / elapsed).toFixed(1),
    p50: fmt(pct(sorted, 50)),
    p95: fmt(pct(sorted, 95)),
    p99: fmt(pct(sorted, 99)),
    statuses: [...r.statuses].map(([s, c]) => `${s}×${c}`).join(' ') + (r.errors ? ` err×${r.errors}` : ''),
  })
}
console.table(rows)
const errorRate = total ? failures / total : 0
console.log(`\nTotal ${total} requests in ${elapsed.toFixed(1)}s (${(total / elapsed).toFixed(1)} req/s), error rate ${(errorRate * 100).toFixed(2)}%`)

// Optional thresholds make this usable as a CI/staging gate
const maxP95 = values['max-p95'] ? Number(values['max-p95']) : null
const maxErr = Number(values['max-error-rate'])
const breaches = []
if (maxP95 !== null && worstP95 > maxP95) breaches.push(`worst p95 ${fmt(worstP95)} > ${maxP95}ms`)
if (errorRate > maxErr) breaches.push(`error rate ${(errorRate * 100).toFixed(2)}% > ${(maxErr * 100).toFixed(2)}%`)
if (breaches.length) {
  console.error(`✗ Threshold exceeded: ${breaches.join('; ')}`)
  process.exit(1)
}
console.log('✓ Within thresholds')
