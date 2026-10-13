import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { AiError, aiErrorResponse } from '@/lib/ai'
import { JobSourceError } from '@/lib/jobs/types'
import { AcademicProviderError } from '@/lib/academics/types'

export type AuthSession = Awaited<ReturnType<typeof auth>>

export async function getAuthSession() {
  return auth()
}

/** Extracts user ID from a NextAuth v5 session. Returns null if not authenticated. */
export async function getUserId(): Promise<string | null> {
  const session = await auth()
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

/** Converts an AiError into the matching HTTP response; returns null for any other error. */
export function aiFailure(err: unknown) {
  if (!(err instanceof AiError)) return null
  console.error('[ai]', err.message)
  const { status, error } = aiErrorResponse(err)
  return NextResponse.json({ error }, { status })
}

/** Converts a JobSourceError into a 4xx with its user-facing message; null for any other error. */
export function jobSourceFailure(err: unknown) {
  if (!(err instanceof JobSourceError)) return null
  const status = err.code === 'not_found' ? 404 : err.code === 'fetch_failed' ? 502 : 422
  return NextResponse.json({ error: err.message, code: err.code }, { status })
}

export function ok(data: unknown) {
  return NextResponse.json(data, { status: 200 })
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 })
}

/** Converts an AcademicProviderError into a 4xx/5xx with its user-facing message; null for any other error. */
export function academicFailure(err: unknown) {
  if (!(err instanceof AcademicProviderError)) return null
  const status = err.code === 'not_configured' ? 503 : err.code === 'upstream' || err.code === 'invalid_data' ? 502 : 422
  return NextResponse.json({ error: err.message, code: err.code }, { status })
}
