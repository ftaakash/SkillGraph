const $ = id => document.getElementById(id)

async function refresh() {
  const { baseUrl, token } = await chrome.storage.local.get(['baseUrl', 'token'])
  if (baseUrl) $('baseUrl').value = baseUrl
  if (!token) {
    $('status').textContent = 'Not connected.'
    $('connect').hidden = false
    $('disconnect').hidden = true
    return
  }
  const res = await chrome.runtime.sendMessage({ type: 'api', path: '/api/extension/me', method: 'GET' })
  if (res?.ok && res.data.profile) {
    $('status').innerHTML = ''
    const line = document.createElement('span')
    line.className = 'ok'
    line.textContent = `Connected as ${res.data.profile.fullName} (${res.data.profile.email})`
    $('status').appendChild(line)
    $('connect').hidden = true
    $('disconnect').hidden = false
  } else {
    $('status').className = 'bad'
    $('status').textContent = res?.data?.error || 'Could not connect.'
    $('connect').hidden = false
    $('disconnect').hidden = false
  }
}

$('connect').addEventListener('submit', async e => {
  e.preventDefault()
  const baseUrl = $('baseUrl').value.trim().replace(/\/+$/, '')
  const token = $('token').value.trim()
  await chrome.storage.local.set({ baseUrl, token })
  $('token').value = ''
  refresh()
})

$('disconnect').addEventListener('click', async () => {
  // Forgets the token here; revoke it in SkillGraph → OpenClaw to stop it working everywhere
  await chrome.storage.local.remove('token')
  refresh()
})

refresh()
