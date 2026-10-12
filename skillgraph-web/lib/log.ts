/**
 * Structured JSON logging (one line per event) so logs are searchable in Vercel,
 * container platforms and log drains. Never log secrets, tokens or passwords.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const minLevel = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info

function serialiseError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 8).join('\n') }
  return { message: String(err) }
}

function write(level: Level, event: string, fields: Fields = {}) {
  if (LEVELS[level] < minLevel) return
  const entry: Fields = { ts: new Date().toISOString(), level, event }
  for (const [k, v] of Object.entries(fields)) entry[k] = k === 'err' || v instanceof Error ? serialiseError(v) : v
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (event: string, fields?: Fields) => write('debug', event, fields),
  info: (event: string, fields?: Fields) => write('info', event, fields),
  warn: (event: string, fields?: Fields) => write('warn', event, fields),
  error: (event: string, fields?: Fields) => write('error', event, fields),
}
