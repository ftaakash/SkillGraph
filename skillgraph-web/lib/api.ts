import { auth } from '@/auth'
import { NextResponse } from 'next/server'

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

export function ok(data: unknown) {
  return NextResponse.json(data, { status: 200 })
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 })
}
