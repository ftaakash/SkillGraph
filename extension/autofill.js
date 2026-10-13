// Fills the application form on the page with the student's SkillGraph profile and attaches the
// tailored résumé. It only fills empty fields, never changes an answer the student typed, and
// never clicks a button: the student reviews the form and submits it themselves.
/* exported fillApplicationForm */

// Field descriptor (label, name, placeholder…) → profile key. First match wins.
const SG_RULES = [
  [/first[\s_-]*name|given[\s_-]*name|fname/, 'firstName'],
  [/last[\s_-]*name|surname|family[\s_-]*name|lname/, 'lastName'],
  [/linked[\s_-]*in/, 'linkedin'],
  [/git[\s_-]*hub|portfolio|personal[\s_-]*(web)?site|website/, 'github'],
  [/e-?mail/, 'email'],
  [/phone|mobile|contact[\s_-]*(no|number)|whatsapp/, 'phone'],
  [/college|university|institut|school/, 'college'],
  [/degree|qualification|course/, 'degree'],
  [/branch|major|speciali[sz]ation|discipline|stream|department/, 'branch'],
  [/cgpa|\bgpa\b|grade[\s_-]*point/, 'cgpa'],
  [/graduation[\s_-]*year|year[\s_-]*of[\s_-]*(passing|graduation)|batch|passing[\s_-]*year/, 'year'],
  [/current[\s_-]*(city|location)|\bcity\b|location/, 'city'],
  [/full[\s_-]*name|^name$|your[\s_-]*name|candidate[\s_-]*name|applicant[\s_-]*name/, 'fullName'],
]

// Questions only the student can answer: highlighted, never guessed
const SG_ASK_STUDENT = /ctc|salary|notice|experience|years|relocat|visa|sponsor|why|cover|gender|disab|veteran|race|ethnic|date of birth|dob|aadhaar|pan\b/

function SG_describe(el) {
  const parts = [el.getAttribute('aria-label'), el.name, el.id, el.placeholder, el.getAttribute('autocomplete')]
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (label) parts.push(label.innerText)
  }
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) labelledBy.split(/\s+/).forEach(id => parts.push(document.getElementById(id)?.innerText))
  const wrapping = el.closest('label')
  if (wrapping) parts.push(wrapping.innerText)
  // Many forms put the question text in the field's container rather than a <label>
  const container = el.closest('[class*="form"], [class*="question"], [class*="field"], fieldset, li, div')
  if (container && container.innerText.length < 200) parts.push(container.innerText)
  return parts.filter(Boolean).join(' ').toLowerCase()
}

const SG_visible = el => el.offsetParent !== null && !el.disabled && !el.readOnly

/** Sets a value the way a user would, so React/Angular forms register it. */
function SG_setValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}

function SG_selectOption(select, value) {
  const want = value.toLowerCase()
  const option = [...select.options].find(o => o.text.toLowerCase().trim() === want) || [...select.options].find(o => want && o.text.toLowerCase().includes(want))
  if (!option) return false
  SG_setValue(select, option.value)
  return true
}

function SG_resumeFile(resume) {
  const bytes = Uint8Array.from(atob(resume.base64), c => c.charCodeAt(0))
  return new File([bytes], resume.fileName, { type: 'application/pdf' })
}

function SG_highlight(el, color) {
  el.style.outline = `2px solid ${color}`
  el.style.outlineOffset = '2px'
}

/**
 * Fills every visible, empty field it recognises. Returns counts for the panel to report.
 * `root` defaults to the whole document (open modals such as LinkedIn Easy Apply included).
 */
function fillApplicationForm(profile, resume, root = document) {
  const result = { filled: 0, attached: 0, needsYou: 0 }
  const fields = root.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select')

  for (const el of fields) {
    if (!SG_visible(el) && el.type !== 'file') continue

    if (el.type === 'file') {
      const desc = SG_describe(el)
      const accepts = (el.accept || '').toLowerCase()
      if (/photo|image|picture|avatar|logo|cover/.test(desc) || /^image\//.test(accepts)) continue
      const isResume = /resume|cv|curriculum/.test(desc) || accepts.includes('pdf') || accepts === ''
      if (!isResume || !resume || el.files?.length) continue
      try {
        const transfer = new DataTransfer()
        transfer.items.add(SG_resumeFile(resume))
        el.files = transfer.files
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        result.attached++
      } catch {
        /* the site blocks programmatic uploads; the panel offers a download instead */
      }
      continue
    }

    if (el.value && el.value.trim()) continue // never overwrite the student's own answer
    const desc = SG_describe(el)
    if (SG_ASK_STUDENT.test(desc)) {
      SG_highlight(el, '#f59e0b')
      result.needsYou++
      continue
    }
    const rule = SG_RULES.find(([re]) => re.test(desc))
    const value = rule && profile[rule[1]]
    if (!value) continue
    const done = el instanceof HTMLSelectElement ? SG_selectOption(el, value) : (SG_setValue(el, value), true)
    if (done) {
      SG_highlight(el, '#22c55e')
      result.filled++
    }
  }
  return result
}
