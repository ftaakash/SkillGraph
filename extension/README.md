# SkillGraph OpenClaw — browser extension

Assisted apply on **LinkedIn, Naukri, Glassdoor and Superset** (ADR-004).

On a job page the extension:
1. reads the job (role, company, location, pay, description);
2. checks it against your OpenClaw filters in SkillGraph;
3. builds a résumé tailored to that job from your uploaded résumé (no invented experience);
4. fills the application form with your profile and attaches the tailored résumé.

**You review the form and press Submit yourself.** Then click *I submitted it* to track the job as Applied.

## Privacy and safety
- SkillGraph never receives your passwords, cookies or session tokens for job sites. The
  extension works inside your own signed-in browser.
- The extension stores one SkillGraph token, which expires after 30 days. Disconnect it any time in SkillGraph → OpenClaw. That stops it working immediately.
- It fills only empty fields, never overwrites what you typed, and never clicks buttons.
  Questions only you can answer (expected CTC, notice period, experience, personal details) are
  highlighted in amber and left blank.

## Install (developer mode)
1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose this `extension/` folder.
2. In SkillGraph → OpenClaw → **Browser extension**, click **Connect extension** and copy the token.
3. Click the extension icon, paste the token, then press **Connect**.

To use a local server, enter its address (e.g. `http://localhost:3000`) in the popup. Only the
addresses listed in `manifest.json` → `host_permissions` are allowed.

## Limits
Job sites change their page markup. If the role or description isn't detected, select the job
description text on the page and press the button again. Form filling is best effort: always
check every field before submitting.
