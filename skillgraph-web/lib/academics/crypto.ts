/**
 * Encryption at rest for university portal sessions (AES-256-GCM).
 *
 * ACADEMIC_ENCRYPTION_KEY is 32 random bytes, base64-encoded (`openssl rand -base64 32`).
 * The user id is bound as associated data, so a ciphertext copied onto another user's row
 * fails to decrypt. Rotating the key invalidates stored sessions; students simply reconnect.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { AcademicProviderError } from './types'

const VERSION = 'v1'

function key() {
  const raw = process.env.ACADEMIC_ENCRYPTION_KEY
  const buf = raw ? Buffer.from(raw, 'base64') : null
  if (!buf || buf.length !== 32) {
    throw new AcademicProviderError('not_configured', 'University connections are not available yet.')
  }
  return buf
}

export function encryptionConfigured() {
  try {
    key()
    return true
  } catch {
    return false
  }
}

export function seal(plaintext: string, boundTo: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(boundTo, 'utf8'))
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.')
}

/** Returns null for anything that does not decrypt under the current key and binding. */
export function unseal(sealed: string, boundTo: string): string | null {
  const [version, iv, tag, body] = sealed.split('.')
  if (version !== VERSION || !iv || !tag || body === undefined) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
    decipher.setAAD(Buffer.from(boundTo, 'utf8'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
