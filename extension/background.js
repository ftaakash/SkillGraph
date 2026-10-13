// Service worker: the only part of the extension that talks to SkillGraph.
// It holds the SkillGraph access token; job-site pages never see it, and nothing from the
// job sites (cookies, sessions, passwords) is ever read or sent.

const DEFAULT_BASE_URL = 'https://skillgraphai.vercel.app'

async function settings() {
  const { baseUrl = DEFAULT_BASE_URL, token = '' } = await chrome.storage.local.get(['baseUrl', 'token'])
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token }
}

async function api(path, { method = 'GET', body } = {}) {
  const { baseUrl, token } = await settings()
  if (!token) return { ok: false, status: 401, data: { error: 'Connect the extension first: click its icon and paste your SkillGraph token.' } }
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 0, data: { error: `Could not reach SkillGraph (${err.message}).` } }
  }
}

// Only these SkillGraph endpoints can be called from content scripts
const ALLOWED = new Set(['GET /api/extension/me', 'POST /api/extension/prepare', 'POST /api/extension/applied'])

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'api') return false
  const key = `${message.method || 'GET'} ${message.path}`
  if (!ALLOWED.has(key)) {
    sendResponse({ ok: false, status: 400, data: { error: 'Not allowed' } })
    return false
  }
  api(message.path, { method: message.method, body: message.body }).then(sendResponse)
  return true // async response
})
