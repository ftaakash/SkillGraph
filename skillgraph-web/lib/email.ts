/**
 * Transactional email. Uses SendGrid when configured; otherwise (development) the
 * message is logged so flows such as password reset can be exercised locally.
 */
import sgMail from '@sendgrid/mail'
import { logger } from '@/lib/log'

let configured = false

export function emailConfigured() {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL)
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function appUrl(path = '') {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('email.not_configured', { subject })
      throw new Error('Email delivery is not configured')
    }
    logger.info('email.dev_outbox', { to, subject, text })
    return
  }
  if (!configured) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    configured = true
  }
  await sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL!, subject, html, text })
}

function layout(title: string, body: string, cta: { label: string; url: string }) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:auto;padding:24px">
<h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>${body}
<p style="margin:24px 0"><a href="${cta.url}" style="background:#0e7490;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">${escapeHtml(cta.label)}</a></p>
<p style="font-size:12px;color:#666">If the button doesn't work, copy this link into your browser:<br>${escapeHtml(cta.url)}</p>
</body></html>`
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = appUrl(`/verify-email?token=${encodeURIComponent(token)}`)
  await sendEmail(
    to,
    'Verify your SkillGraph email',
    layout('Confirm your email', `<p>Hi ${escapeHtml(name)},</p><p>Please confirm this is your email address. The link expires in 24 hours.</p>`, { label: 'Verify email', url }),
    `Hi ${name},\n\nConfirm your SkillGraph email address (link expires in 24 hours):\n${url}\n`
  )
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`)
  await sendEmail(
    to,
    'Reset your SkillGraph password',
    layout('Reset your password', `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset your password. The link expires in 1 hour. If you didn't ask for this, you can ignore this email — your password won't change.</p>`, { label: 'Choose a new password', url }),
    `Hi ${name},\n\nReset your SkillGraph password (link expires in 1 hour):\n${url}\n\nIf you didn't request this, ignore this email.\n`
  )
}
