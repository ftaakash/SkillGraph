import type { Instrumentation } from 'next'

/**
 * Server error reporting (ADR-001 Phase 3). Every uncaught server error is logged as one
 * structured JSON line with the request id from proxy.ts. Set ERROR_WEBHOOK_URL to also
 * forward a compact report to an incident channel or error collector.
 * Never forward request headers wholesale — they contain session cookies.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string }
  const requestId = typeof request.headers['x-request-id'] === 'string' ? request.headers['x-request-id'] : undefined
  const report = {
    ts: new Date().toISOString(),
    level: 'error',
    event: 'server.unhandled_error',
    requestId,
    digest: error.digest,
    method: request.method,
    path: request.path.split('?')[0],
    routePath: context.routePath,
    routeType: context.routeType,
    error: { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 8).join('\n') },
  }
  console.error(JSON.stringify(report))

  const webhook = process.env.ERROR_WEBHOOK_URL
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...report, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV }),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // Reporting must never break request handling
    }
  }
}
