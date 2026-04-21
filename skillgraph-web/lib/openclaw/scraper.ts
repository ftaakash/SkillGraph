import { chromium } from 'playwright-extra';
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());

// ─── JD Skill Extractor ─────────────────────────────────────────────────────
// Keyword-based extraction from JD text. Fast, zero API cost, zero latency.
const SKILL_KEYWORDS = [
  // Languages
  'python','javascript','typescript','java','c++','c#','go','rust','kotlin','swift',
  'ruby','php','scala','r','dart','elixir','haskell','perl',
  // Web Frameworks
  'react','next.js','vue','angular','svelte','nuxt','gatsby','remix','express',
  'fastapi','flask','django','spring','nestjs','laravel','rails','asp.net',
  // Mobile
  'react native','flutter','android','ios','swiftui','jetpack compose',
  // Databases
  'postgresql','mysql','mongodb','redis','sqlite','dynamodb','cassandra',
  'elasticsearch','firestore','neo4j','supabase','planetscale','cockroachdb',
  // Cloud & Infra
  'aws','gcp','azure','docker','kubernetes','terraform','ansible','jenkins',
  'github actions','ci/cd','cloudflare','nginx','linux',
  // AI/ML
  'pytorch','tensorflow','scikit-learn','hugging face','langchain','openai',
  'llm','rag','machine learning','deep learning','nlp','computer vision',
  // Data
  'spark','kafka','airflow','dbt','snowflake','bigquery','pandas','numpy',
  // Tools
  'git','graphql','rest','grpc','websockets','prisma','sequelize','mongoose',
  'jest','vitest','cypress','playwright','storybook','webpack','vite','turbopack',
  // Other
  'node.js','bun','deno','microservices','system design','agile','scrum',
];

export function extractSkillsFromJD(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter(skill => lower.includes(skill));
}


export interface OpenClawListing {
  title: string;
  company: string;
  skills: string[];
  salary: string;
  location: string;
  url: string;
  platform: 'Naukri' | 'LinkedIn' | 'Glassdoor' | 'Indeed';
}

export async function scrapePlatformWithPlaywright(url: string, platform: OpenClawListing['platform'], selectors: any): Promise<OpenClawListing[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    if (!response || response.status() >= 400) {
       await browser.close();
       return [];
    }

    const listings = await page.$$eval(selectors.card, (els, platformLabel) => {
      // Playwright-scraped cards don't give us the full JD text in-card, but we
    // can extract skills from whatever text is available in the card elements.
    return els.map(el => {
      const titleEl = el.querySelector('h1, h2, h3, .title, .job-title');
      const companyEl = el.querySelector('.companyName, .company, h4');
      const salaryEl = el.querySelector('.salary, .compensation');
      const locEl = el.querySelector('.location, .loc');
      const cardText = el.textContent || '';
      
      return {
        title: titleEl?.textContent?.trim() || '',
        company: companyEl?.textContent?.trim() || '',
        skills: [] as string[], // Will be populated server-side after browser.close()
        salary: salaryEl?.textContent?.trim() || 'Not disclosed',
        location: locEl?.textContent?.trim() || '',
        url: (el.querySelector('a') as HTMLAnchorElement)?.href || '',
        platform: platformLabel as any,
        _cardText: cardText, // Pass raw text for server-side skill extraction
      };
    }).filter(job => job.title && job.company);
    }, platform);

    if (listings.length === 0) {
      console.log(`Playwright scraping yielded 0 for ${platform}. Falling back to JSearch API...`);
      return fallbackToJSearch(url, platform);
    }
    
    // Server-side skill extraction from card text
    return listings.map((l: any) => ({
      ...l,
      skills: extractSkillsFromJD(l._cardText || ''),
      _cardText: undefined,  // Remove temp field
    }));
  } catch (error) {
    console.error(`Error scraping ${platform}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

export async function scrapeNaukri(role: string, city: string): Promise<OpenClawListing[]> {
  const url = `https://www.naukri.com/${role.toLowerCase().replace(/ /g, '-')}-jobs-in-${city.toLowerCase().replace(/ /g, '-')}`;
  return scrapePlatformWithPlaywright(url, 'Naukri', { card: '.srp-jobtuple-wrapper, .jobTuple' });
}

export async function scrapeLinkedIn(role: string, city: string): Promise<OpenClawListing[]> {
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(city)}`;
  return scrapePlatformWithPlaywright(url, 'LinkedIn', { card: '.base-card, .job-search-card' });
}

export async function scrapeGlassdoor(role: string, city: string): Promise<OpenClawListing[]> {
  const url = `https://www.glassdoor.co.in/Job/${city.toLowerCase().replace(/ /g, '-')}-${role.toLowerCase().replace(/ /g, '-')}-jobs.htm`;
  return scrapePlatformWithPlaywright(url, 'Glassdoor', { card: '.react-job-listing, .JobCard_jobCardContainer___WQ12' });
}

export async function scrapeIndeed(role: string, city: string): Promise<OpenClawListing[]> {
  const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(city)}`;
  return scrapePlatformWithPlaywright(url, 'Indeed', { card: '.job_seen_beacon, .resultContent' });
}

// REST Fallback for Live Job Listings
async function fallbackToJSearch(originalUrl: string, platform: OpenClawListing['platform']): Promise<OpenClawListing[]> {
  if (!process.env.RAPIDAPI_KEY) return [];
  try {
    const defaultRole = "Software Engineer";
    let query = defaultRole;
    if (originalUrl.includes('naukri')) query = "developer in India";
    else if (originalUrl.includes('linkedin')) query = "developer in Bangalore";
    
    const res = await fetch(`https://${process.env.RAPIDAPI_HOST}/search?query=${encodeURIComponent(query)}&num_pages=1&country=in`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com'
      }
    });

    const body = await res.json();
    if (!body?.data || !Array.isArray(body.data)) return [];

    // Only return jobs with a verified apply link — never use placeholder URLs
    return body.data
      .filter((j: any) => j.job_apply_link && j.employer_name)
      .slice(0, 10)
      .map((j: any) => ({
        title: j.job_title || 'Software Engineer',
        company: j.employer_name,
        skills: [],
        salary: j.job_min_salary ? `${j.job_min_salary}-${j.job_max_salary} USD` : 'Not disclosed',
        location: `${j.job_city || ''}, ${j.job_state || ''}`.trim().replace(/^,\s*/, ''),
        url: j.job_apply_link,
        platform: platform
      }));
  } catch (error) {
    console.error('JSearch Fallback failed:', error);
    return [];
  }
}

// ─── Single-URL scraper for the Auto-Pipeline ──────────────────────────────

export interface ScrapeJobResult {
  id?: string
  platform: string
  company: string
  role: string
  location: string | null
  ctcBand: string | null
  jdText: string
  sourceUrl: string
  skills?: string[]
}

export async function scrapeJobUrl(url: string): Promise<ScrapeJobResult | null> {
  const platform = url.includes('naukri') ? 'Naukri'
    : url.includes('linkedin') ? 'LinkedIn'
    : url.includes('greenhouse') ? 'Greenhouse'
    : url.includes('lever') ? 'Lever'
    : url.includes('ashby') ? 'Ashby'
    : url.includes('internshala') ? 'Internshala'
    : url.includes('wellfound') ? 'Wellfound'
    : url.includes('unstop') ? 'Unstop'
    : 'Web'

  try {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})

    const title = await page.$eval('h1', el => el.textContent?.trim() ?? '').catch(() => '')
    const description = await page.$eval('body', el => el.innerText?.slice(0, 3000) ?? '').catch(() => '')
    await browser.close()

    // INTEGRITY GATE: if we can't extract real page content, skip this job entirely.
    // We never fabricate application data — not even in dev or error scenarios.
    if (!description || !title) {
      console.warn(`[Scraper] Could not extract content from ${url}. Skipping to preserve application integrity.`)
      return null
    }

    // Best-effort metadata extraction from real page content
    const companyMatch = description.match(/at\s+([A-Z][a-zA-Z\s&.]{2,40})/)?.[1]?.trim()
    const ctcMatch = description.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*LPA/i)
    const locationMatch = description.match(/(Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|Kolkata|Remote|Gurgaon)/i)

    return {
      platform,
      company: companyMatch ?? 'Unknown Company',
      role: title,
      location: locationMatch?.[0] ?? null,
      ctcBand: ctcMatch ? `${ctcMatch[1]}-${ctcMatch[2]} LPA` : null,
      jdText: description,
      sourceUrl: url,
      skills: extractSkillsFromJD(description),
    }
  } catch (err) {
    // Real scraping failed — return null. We NEVER create fake job applications.
    console.error(`[Scraper] Failed to reach ${url}:`, err)
    return null
  }
}
