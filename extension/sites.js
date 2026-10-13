// Reads the job currently shown on a supported job site.
// Selectors are best effort: sites change their markup, so every field has fallbacks, and the
// student can select the job description text themselves if it isn't found.
// Checked against live pages on 2026-10-13: LinkedIn (signed-out job pages), Naukri, Glassdoor.
/* exported readJob */

const SG_text = (selectors, root = document) => {
  for (const sel of selectors) {
    const el = root.querySelector(sel)
    const value = el && (el.innerText || el.textContent || '').replace(/\s+\n/g, '\n').trim()
    if (value) return value
  }
  return ''
}

/** First line only: Glassdoor appends the star rating to the employer name. */
const SG_firstLine = s => (s || '').split('\n')[0].trim()

/** The longest visible block of text on the page — a fallback for the job description. */
const SG_largestBlock = () => {
  let best = ''
  for (const el of document.querySelectorAll('main section, main div, article, [class*="description"], [id*="description"]')) {
    const t = (el.innerText || '').trim()
    if (t.length > best.length && t.length < 20000) best = t
  }
  return best
}

const SG_selection = () => (window.getSelection()?.toString() || '').trim()

const SITES = [
  {
    platform: 'LinkedIn',
    test: () => location.hostname.endsWith('linkedin.com'),
    read: () => {
      // Signed in: /jobs/view/123 or ?currentJobId=123. Public pages: /jobs/view/<title>-at-<company>-123
      const id = new URLSearchParams(location.search).get('currentJobId') || location.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/)?.[1]
      // Public page titles read "<Company> hiring <Role> in <Location> | LinkedIn"
      const fromTitle = document.title.match(/^(.+?) hiring (.+?) in (.+?) \| LinkedIn/)
      return {
        url: id ? `https://www.linkedin.com/jobs/view/${id}/` : location.href.split('?')[0],
        role: SG_text(['.job-details-jobs-unified-top-card__job-title h1', '.jobs-unified-top-card__job-title', 'h1.top-card-layout__title', 'h1']) || fromTitle?.[2] || '',
        company: SG_firstLine(SG_text(['.job-details-jobs-unified-top-card__company-name a', '.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name a', 'a.topcard__org-name-link', '.topcard__org-name-link'])) || fromTitle?.[1] || '',
        location: SG_firstLine(SG_text(['.job-details-jobs-unified-top-card__primary-description-container .tvm__text', '.job-details-jobs-unified-top-card__bullet', '.jobs-unified-top-card__bullet', '.topcard__flavor--bullet'])) || fromTitle?.[3] || '',
        ctcBand: SG_text(['.job-details-jobs-unified-top-card__job-insight span[dir]', '.compensation__salary', '.salary']),
        jdText: SG_text(['#job-details', '.jobs-description__content', '.jobs-box__html-content', '.jobs-description-content__text', '.show-more-less-html__markup', '.description__text']),
      }
    },
  },
  {
    platform: 'Naukri',
    test: () => location.hostname.endsWith('naukri.com'),
    read: () => ({
      url: location.href.split('?')[0],
      role: SG_text(['h1[class*="jd-header-title"]', '.jd-header-title', 'h1']),
      company: SG_firstLine(SG_text(['[class*="jd-header-comp-name"] a', '[class*="jd-header-comp-name"]', '.jd-header-comp-name a'])),
      location: SG_text(['[class*="jhc__location"]', '.location', '.loc']),
      ctcBand: SG_text(['[class*="jhc__salary"]', '.salary']),
      jdText: SG_text(['[class*="dang-inner-html"]', '[class*="job-desc"]', '.job-desc', 'section.job-desc']),
    }),
  },
  {
    platform: 'Glassdoor',
    test: () => /(^|\.)glassdoor\.(co\.in|com)$/.test(location.hostname),
    read: () => {
      // On search pages the URL is the search; the job title links to the job itself (…/job-listing/…?jl=<id>)
      const link = document.querySelector('[data-test="job-title"]')?.closest('a')?.href
      const jl = link && new URL(link).searchParams.get('jl')
      return {
        url: link ? link.split('?')[0] + (jl ? `?jl=${jl}` : '') : location.href.split('?')[0],
        role: SG_text(['[data-test="job-title"]', '[data-test="jobTitle"]', 'h1']),
        company: SG_firstLine(SG_text(['[data-test="employer-name"]', '[data-test="employerName"]', '[class*="EmployerProfile_employerName"]'])),
        location: SG_text(['[data-test="location"]', '[data-test="emp-location"]']),
        ctcBand: SG_text(['[data-test="detailSalary"]', '[class*="SalaryEstimate"]']),
        jdText: SG_text(['[class*="JobDetails_jobDescription"]', '.jobDescriptionContent', '#JobDescriptionContainer', '[class*="jobDescription"]']),
      }
    },
  },
  {
    // Superset is a single-page app behind each college's login; its markup varies, so the readers
    // are generic. Not yet checked against a live page.
    platform: 'Superset',
    test: () => location.hostname.endsWith('joinsuperset.com'),
    read: () => ({
      url: location.href,
      role: SG_text(['[class*="job-title"]', '[class*="JobTitle"]', '[class*="profile-title"]', 'h1', 'h2']),
      company: SG_firstLine(SG_text(['[class*="company-name"]', '[class*="CompanyName"]', '[class*="companyName"]'])),
      location: SG_text(['[class*="location"]', '[class*="Location"]']),
      ctcBand: SG_text(['[class*="ctc"]', '[class*="CTC"]', '[class*="salary"]', '[class*="Salary"]']),
      jdText: SG_text(['[class*="job-description"]', '[class*="JobDescription"]', '[class*="description"]']),
    }),
  },
]

function readJob() {
  const site = SITES.find(s => s.test())
  if (!site) return null
  const job = site.read()
  // The student's own selection always wins; otherwise fall back to the largest text block
  const selected = SG_selection()
  if (selected.length >= 50) job.jdText = selected
  if (!job.jdText || job.jdText.length < 50) job.jdText = SG_largestBlock()
  return { platform: site.platform, ...job, jdText: (job.jdText || '').slice(0, 20000) }
}
