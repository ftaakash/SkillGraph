// The OpenClaw panel shown on supported job pages.
// Flow: read the job → check it against the student's filters → tailor the résumé →
// fill the form → the student reviews and submits → "I submitted it" tracks it in SkillGraph.
/* global readJob, fillApplicationForm */

;(() => {
  if (window.__sgOpenClaw) return
  window.__sgOpenClaw = true

  const call = (path, method = 'GET', body) =>
    new Promise(resolve => chrome.runtime.sendMessage({ type: 'api', path, method, body }, resolve))

  // ── Panel (shadow DOM so the site's CSS can't break it) ──────────────────────
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647'
  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `
    <style>
      :host { all: initial }
      .box { font: 13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; color: #e5e7eb; background: #111827;
             border: 1px solid #374151; border-radius: 12px; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,.4) }
      .head { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #1f2937; font-weight:600 }
      .body { padding: 10px 12px; max-height: 60vh; overflow:auto }
      button { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid #374151; background:#1f2937; color:#e5e7eb; padding:6px 10px }
      button.primary { background:#2563eb; border-color:#2563eb; color:#fff }
      button:disabled { opacity:.5; cursor:default }
      .row { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px }
      .muted { color:#9ca3af; font-size:12px }
      .ok { color:#4ade80 } .bad { color:#f87171 } .warn { color:#fbbf24 }
      ul { margin:6px 0 0 16px; padding:0 } a { color:#93c5fd }
      .min { background:none; border:none; padding:0 4px; color:#9ca3af }
    </style>
    <div class="box">
      <div class="head"><span>Smart Apply</span><button class="min" id="toggle" title="Minimise">–</button></div>
      <div class="body" id="body"></div>
    </div>`
  document.documentElement.appendChild(host)
  const body = shadow.getElementById('body')
  shadow.getElementById('toggle').onclick = () => { body.hidden = !body.hidden }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  let state = { job: null, prepared: null }

  function render(html) { body.innerHTML = html }
  function on(id, fn) { const el = shadow.getElementById(id); if (el) el.onclick = fn }

  function showJob(message = '') {
    const job = readJob()
    state.job = job
    if (!job || !job.role) {
      render(`<div class="muted">Open a job to tailor your résumé for it.</div>${message}`)
      return
    }
    render(`
      <div><b>${esc(job.role)}</b></div>
      <div class="muted">${esc(job.company || 'Company not found')}${job.location ? ' · ' + esc(job.location) : ''}</div>
      <div class="muted">${job.jdText.length >= 50 ? `Job description found (${job.jdText.length} characters)` : '<span class="warn">Job description not found: select its text on the page, then try again.</span>'}</div>
      ${message}
      <div class="row"><button class="primary" id="prepare">Check filters &amp; tailor résumé</button></div>`)
    on('prepare', () => prepare(false))
  }

  async function prepare(force) {
    const job = readJob()
    if (!job?.role || !job.company) return showJob('<div class="bad">Couldn’t read the role and company on this page.</div>')
    state.job = job
    render('<div class="muted">Checking your filters and tailoring your résumé… (up to 30 s)</div>')
    const res = await call('/api/extension/prepare', 'POST', { ...job, force })
    if (!res?.ok) return showJob(`<div class="bad">${esc(res?.data?.error || 'Something went wrong.')}</div>`)
    const { verdict, prepared } = res.data
    const reasons = `<ul>${verdict.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`
    if (!prepared) {
      render(`
        <div class="bad"><b>Outside your filters</b></div>${reasons}
        <div class="row"><button id="force">Tailor anyway</button><button id="back">Back</button></div>`)
      on('force', () => prepare(true))
      on('back', () => showJob())
      return
    }
    state.prepared = res.data
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(res.data.resume.base64), c => c.charCodeAt(0))], { type: 'application/pdf' }))
    render(`
      <div class="${verdict.ok ? 'ok' : 'warn'}"><b>${verdict.ok ? 'Matches your filters' : 'Outside your filters (tailored anyway)'}</b></div>${reasons}
      <div style="margin-top:8px">Résumé tailored to this job${res.data.reused ? ' (saved earlier)' : ''}: <a href="${url}" download="${esc(res.data.resume.fileName)}">${esc(res.data.resume.fileName)}</a></div>
      <div class="muted" style="margin-top:6px">Open the site’s application form, then fill it. Check every field before you submit.</div>
      <div class="row"><button class="primary" id="fill">Fill application form</button><button id="applied">I submitted it</button></div>
      <div id="fillResult" class="muted"></div>`)
    on('fill', fill)
    on('applied', markApplied)
  }

  function fill() {
    const p = state.prepared
    if (!p) return
    // Prefer an open dialog (e.g. LinkedIn Easy Apply), otherwise the whole page
    const dialog = document.querySelector('[role="dialog"]:not([aria-hidden="true"])')
    const r = fillApplicationForm(p.profile || {}, p.resume, dialog || document)
    const out = shadow.getElementById('fillResult')
    out.innerHTML = `Filled ${r.filled} field${r.filled === 1 ? '' : 's'} (green)` +
      (r.attached ? `, attached your résumé` : `. If the résumé isn’t attached, upload the file above yourself`) +
      (r.needsYou ? `. <span class="warn">${r.needsYou} question${r.needsYou === 1 ? '' : 's'} need your answer (amber).</span>` : '.') +
      ' Multi-step form? Press Fill again on each step.'
  }

  async function markApplied() {
    const p = state.prepared
    if (!p) return
    const res = await call('/api/extension/applied', 'POST', { applicationId: p.applicationId })
    if (!res?.ok) return (shadow.getElementById('fillResult').innerHTML = `<span class="bad">${esc(res?.data?.error || 'Could not update SkillGraph.')}</span>`)
    render('<div class="ok"><b>Tracked as Applied in SkillGraph.</b></div><div class="row"><button id="next">Next job</button></div>')
    on('next', () => { state.prepared = null; showJob() })
  }

  // Job sites are single-page apps: re-read when the URL changes
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      // A different job is now open: drop the previous one's résumé (application steps keep it)
      const now = readJob()
      if (!state.prepared || (now?.role && now.url !== state.job?.url)) {
        state.prepared = null
        showJob()
      }
    }
  }, 1000)

  setTimeout(showJob, 1500)
})()
