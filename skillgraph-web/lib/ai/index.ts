/**
 * lib/ai — the single entry point for LLM calls from route handlers.
 *
 *  - Validates model output against a zod schema (one corrective retry on bad output)
 *  - Bounded latency: per-request timeout + SDK retries on transient upstream errors
 *  - Per-user daily token quota, metered in the AiUsage table
 *
 * Metering is fail-soft: if the AiUsage table is unavailable (e.g. migration not yet
 * applied) the call still proceeds and a warning is logged.
 */
import { z } from 'zod'
import { openai, type GPTModel } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export const DEFAULT_MODEL: GPTModel = 'llama-3.3-70b-versatile'
const REQUEST_TIMEOUT_MS = 45_000
const SDK_MAX_RETRIES = 2

/** Tokens a single user may consume per rolling 24h. Override with AI_DAILY_TOKEN_LIMIT. */
export function dailyTokenLimit(): number {
  const raw = Number(process.env.AI_DAILY_TOKEN_LIMIT)
  return Number.isFinite(raw) && raw > 0 ? raw : 200_000
}

export type AiErrorCode = 'quota_exceeded' | 'invalid_output' | 'upstream'

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message)
    this.name = 'AiError'
  }
}

/** Maps an AiError to an HTTP status + user-facing message for route handlers. */
export function aiErrorResponse(err: AiError): { status: number; error: string } {
  switch (err.code) {
    case 'quota_exceeded':
      return { status: 429, error: 'Daily AI usage limit reached. Please try again tomorrow.' }
    case 'invalid_output':
      return { status: 502, error: 'The AI returned an unexpected response. Please retry.' }
    default:
      return { status: 503, error: 'The AI service is temporarily unavailable. Please retry.' }
  }
}

export async function assertAiQuota(userId: string): Promise<void> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const usage = await prisma.aiUsage.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { promptTokens: true, completionTokens: true },
    })
    const used = (usage._sum.promptTokens ?? 0) + (usage._sum.completionTokens ?? 0)
    if (used >= dailyTokenLimit()) {
      throw new AiError('quota_exceeded', `User ${userId} exceeded daily AI token limit`)
    }
  } catch (err) {
    if (err instanceof AiError) throw err
    console.warn('[ai] quota check skipped:', (err as Error).message)
  }
}

async function recordUsage(entry: {
  userId?: string | null
  feature: string
  model: string
  promptTokens: number
  completionTokens: number
  success: boolean
}) {
  try {
    await prisma.aiUsage.create({ data: { ...entry, userId: entry.userId ?? null } })
  } catch (err) {
    console.warn('[ai] usage not recorded:', (err as Error).message)
  }
}

/** Pulls the first JSON object/array out of a model reply, tolerating ```json fences and prose. */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(text)
  } catch {
    const start = text.search(/[[{]/)
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
    if (start === -1 || end <= start) throw new Error('no JSON found in model output')
    return JSON.parse(text.slice(start, end + 1))
  }
}

export type GenerateJsonOptions<S extends z.ZodType> = {
  /** Short identifier used for metering, e.g. "gap_analysis". */
  feature: string
  system: string
  prompt: string
  schema: S
  /** Null for system/background calls that are not attributable to a user. */
  userId: string | null
  model?: GPTModel
  maxTokens?: number
  temperature?: number
}

/**
 * Calls the LLM and returns output validated against `schema`.
 * Throws AiError('quota_exceeded' | 'invalid_output' | 'upstream').
 */
export async function generateJson<S extends z.ZodType>(opts: GenerateJsonOptions<S>): Promise<z.infer<S>> {
  const model = opts.model ?? DEFAULT_MODEL
  if (opts.userId) await assertAiQuota(opts.userId)

  // json_object mode only accepts object-shaped output; array prompts run in plain text mode
  const expectsObject = opts.schema instanceof z.ZodObject
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.prompt },
  ]

  let lastIssue = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    let content: string
    try {
      const response = await openai.chat.completions.create(
        {
          model,
          messages,
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.2,
          ...(expectsObject ? { response_format: { type: 'json_object' as const } } : {}),
        },
        { timeout: REQUEST_TIMEOUT_MS, maxRetries: SDK_MAX_RETRIES }
      )
      content = response.choices[0]?.message?.content ?? ''
      await recordUsage({
        userId: opts.userId,
        feature: opts.feature,
        model,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        success: true,
      })
    } catch (err) {
      await recordUsage({ userId: opts.userId, feature: opts.feature, model, promptTokens: 0, completionTokens: 0, success: false })
      throw new AiError('upstream', `[${opts.feature}] LLM request failed: ${(err as Error).message}`)
    }

    try {
      const result = opts.schema.safeParse(extractJson(content))
      if (result.success) return result.data
      lastIssue = result.error.issues.slice(0, 3).map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    } catch (err) {
      lastIssue = (err as Error).message
    }

    // Give the model one chance to correct itself
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Your reply did not match the required JSON schema (${lastIssue}). Reply again with ONLY the corrected JSON.` }
    )
  }

  throw new AiError('invalid_output', `[${opts.feature}] model output failed validation: ${lastIssue}`)
}
