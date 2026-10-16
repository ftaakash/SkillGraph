/** Display labels shared by the OpenClaw pipeline and activity feed. */

export const STATUS_LABELS: Record<string, string> = {
  Pending: 'Evaluated',
  ReadyToApply: 'Ready to apply',
  Applied: 'Applied',
  Viewed: 'Viewed',
  Shortlisted: 'Shortlisted',
  Interviewing: 'Interviewing',
  Offer: 'Offer',
  Rejected: 'Rejected',
  Withdrawn: 'Withdrawn',
  Closed: 'Closed',
  Duplicate: 'Duplicate',
  UnableToApply: 'Not submitted',
  Failed: 'Not submitted',
}

export const statusLabel = (status: string) => STATUS_LABELS[status] ?? status

const RECOMMENDATIONS: Record<string, string> = {
  AutoApply: 'Strong match: apply',
  ReviewAndApply: 'Review, then apply',
  Skip: 'Probably skip',
}

export const recommendationLabel = (r: string) => RECOMMENDATIONS[r] ?? r

/** How an Applied application was submitted. */
export function submittedViaLabel(via: string | null | undefined) {
  if (via === 'ats_api') return 'Submitted for you'
  if (via === 'extension') return 'Via extension'
  if (via === 'manual') return 'By you'
  return null
}

/**
 * tailoringNotes holds either a JSON evaluation (jobs the student evaluated) or the agent's plain
 * text ("what to emphasise", then optionally "Not auto-submitted: <reason>").
 */
export function parseTailoringNotes(raw: string | null | undefined): {
  evaluation: { grade?: string; recommendation?: string; keyStrengths?: string[]; keyWeaknesses?: string[]; matchScore?: number } | null
  advice: string | null
  notSubmittedReason: string | null
} {
  if (!raw) return { evaluation: null, advice: null, notSubmittedReason: null }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return { evaluation: parsed, advice: null, notSubmittedReason: null }
  } catch {
    /* plain-text notes */
  }
  const [advice, reason] = raw.split(/\n*Not auto-submitted:\s*/)
  return { evaluation: null, advice: advice.trim() || null, notSubmittedReason: reason?.trim() || null }
}
