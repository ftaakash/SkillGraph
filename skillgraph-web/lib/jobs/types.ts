/** A job posting normalised from any supported source. */
export interface JobListing {
  /** Where the listing came from, e.g. "Greenhouse", "Lever", "JSearch", "Manual". */
  platform: string
  company: string
  role: string
  location: string | null
  ctcBand: string | null
  /** Plain-text job description. */
  jdText: string
  /** Canonical posting URL — the user applies here themselves. */
  sourceUrl: string
}

export type JobSourceErrorCode =
  | 'unsupported_source' // site whose terms forbid automated access — user must paste the JD
  | 'invalid_url'
  | 'blocked_address' // SSRF guard rejected the destination
  | 'not_found'
  | 'fetch_failed'
  | 'no_content'

export class JobSourceError extends Error {
  constructor(public code: JobSourceErrorCode, message: string) {
    super(message)
    this.name = 'JobSourceError'
  }
}
