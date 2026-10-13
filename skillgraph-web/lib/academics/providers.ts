/**
 * Sources of a student's academic record (ADR-002 Phase 5).
 *
 * - srm_api       The university's official API, authorised with an API key issued to
 *                 SkillGraph. Students are identified by their verified university email.
 * - srm_academia  Signs in to the university portal with the student's own credentials.
 *                 The password is used once to open a portal session and is never stored;
 *                 only the session, encrypted, is kept for later syncs.
 *
 * Provider output is untrusted: lib/academics/sync.ts validates it against academicDataSchema.
 */
import { AcademicProviderError, type ProviderId } from './types'
import { encryptionConfigured } from './crypto'

export type ProviderUser = { userId: string; email: string; emailVerified: boolean }
export type ProviderConnection = { externalId: string | null; session: string | null }
export type ConnectResult = { externalId: string | null; session: { data: string; expiresAt: Date | null } | null }

export interface AcademicProvider {
  id: ProviderId
  label: string
  /** Whether connecting asks the student for their portal password */
  needsPassword: boolean
  available(): boolean
  connect(user: ProviderUser, input: { login?: string; password?: string }): Promise<ConnectResult>
  fetch(user: ProviderUser, connection: ProviderConnection): Promise<unknown>
}

export const universityEmailDomain = () => (process.env.SRM_EMAIL_DOMAIN || 'srmist.edu.in').toLowerCase()
const onUniversityDomain = (email: string) => email.toLowerCase().endsWith(`@${universityEmailDomain()}`)

// ─── Official API ────────────────────────────────────────────────────────────

/**
 * Expected contract until the university publishes its own (then adapt `fetch` only):
 *   GET {SRM_API_BASE_URL}/v1/students/{email}/academics
 *   Authorization: Bearer {SRM_API_KEY}
 *   200 → AcademicData JSON (lib/academics/types.ts); 404 → student not found
 */
export const srmApiProvider: AcademicProvider = {
  id: 'srm_api',
  label: 'SRM official API',
  needsPassword: false,
  available: () => Boolean(process.env.SRM_API_BASE_URL && process.env.SRM_API_KEY),

  async connect(user) {
    // The API trusts SkillGraph, so SkillGraph must be sure who the student is
    if (!user.emailVerified || !onUniversityDomain(user.email)) {
      throw new AcademicProviderError(
        'not_eligible',
        `Sign in to SkillGraph with your verified @${universityEmailDomain()} email to connect your university record.`,
      )
    }
    return { externalId: user.email.toLowerCase(), session: null }
  },

  async fetch(user) {
    // Re-checked on every sync: the account's email can change after connecting
    await srmApiProvider.connect(user, {})
    const base = process.env.SRM_API_BASE_URL!.replace(/\/$/, '')
    let res: Response
    try {
      res = await fetch(`${base}/v1/students/${encodeURIComponent(user.email.toLowerCase())}/academics`, {
        headers: { Authorization: `Bearer ${process.env.SRM_API_KEY}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      })
    } catch {
      throw new AcademicProviderError('upstream', 'The university system did not respond. Try again shortly.')
    }
    if (res.status === 404) throw new AcademicProviderError('not_eligible', 'The university has no record for your email.')
    if (res.status === 401 || res.status === 403) {
      console.error('[academics] srm_api rejected the API key', res.status)
      throw new AcademicProviderError('not_configured', 'University connections are temporarily unavailable.')
    }
    if (!res.ok) throw new AcademicProviderError('upstream', 'The university system returned an error. Try again shortly.')
    try {
      return await res.json()
    } catch {
      throw new AcademicProviderError('invalid_data', 'The university system returned data SkillGraph could not read.')
    }
  },
}

// ─── Portal connector ────────────────────────────────────────────────────────

/**
 * The portal-specific part of the connector: how to sign in and read the student's pages.
 * Implementations must hold the password only for the duration of signIn, never log it,
 * and throw AcademicProviderError codes: invalid_credentials, captcha_required (never try
 * to solve a CAPTCHA — the student signs in on the portal first), reauth_required (session
 * expired) or upstream.
 */
export interface AcademiaTransport {
  signIn(login: string, password: string): Promise<{ session: string; expiresAt: Date | null; externalId: string | null }>
  fetchAcademicData(session: string): Promise<unknown>
}

/**
 * Not implemented yet. The sign-in flow and page parsers must be written and verified against
 * a real student account with the university's permission (ADR-002, "Portal connector"); until
 * then the connector reports itself unavailable and the official API / college imports are used.
 */
const academiaTransport = null as AcademiaTransport | null

export const srmAcademiaProvider: AcademicProvider = {
  id: 'srm_academia',
  label: 'SRM Academia sign-in',
  needsPassword: true,
  available: () =>
    process.env.SRM_ACADEMIA_CONNECTOR === 'enabled' && academiaTransport !== null && encryptionConfigured(),

  async connect(_user, { login, password }) {
    if (!academiaTransport) throw new AcademicProviderError('not_configured', 'Academia sign-in is not available yet.')
    const id = (login ?? '').trim().toLowerCase()
    if (!id || !password) throw new AcademicProviderError('invalid_credentials', 'Enter your Academia email and password.')
    const loginEmail = id.includes('@') ? id : `${id}@${universityEmailDomain()}`
    if (!onUniversityDomain(loginEmail)) {
      throw new AcademicProviderError('invalid_credentials', `Use your @${universityEmailDomain()} Academia login.`)
    }
    const { session, expiresAt, externalId } = await academiaTransport.signIn(loginEmail, password)
    return { externalId: externalId ?? loginEmail, session: { data: session, expiresAt } }
  },

  async fetch(_user, connection) {
    if (!academiaTransport) throw new AcademicProviderError('not_configured', 'Academia sign-in is not available yet.')
    if (!connection.session) throw new AcademicProviderError('reauth_required', 'Sign in to Academia again to sync.')
    return academiaTransport.fetchAcademicData(connection.session)
  },
}

export const PROVIDERS: Record<ProviderId, AcademicProvider> = {
  srm_api: srmApiProvider,
  srm_academia: srmAcademiaProvider,
}

export function availableProviders() {
  return Object.values(PROVIDERS)
    .filter(p => p.available())
    .map(p => ({ id: p.id, label: p.label, needsPassword: p.needsPassword }))
}
