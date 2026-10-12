// Keyword-based skill extraction from JD text — zero API cost, used for quick matching hints.
const SKILL_KEYWORDS = [
  // Languages
  'python','javascript','typescript','java','c++','c#','go','rust','kotlin','swift',
  'ruby','php','scala','dart','elixir','haskell','perl',
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
]

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SKILL_PATTERNS = SKILL_KEYWORDS.map(skill => ({
  skill,
  // Word-ish boundaries so "go" doesn't match "good" and "java" doesn't match "javascript"
  re: new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(skill)}(?![a-z0-9+#])`, 'i'),
}))

export function extractSkillsFromJD(text: string): string[] {
  return SKILL_PATTERNS.filter(({ re }) => re.test(text)).map(({ skill }) => skill)
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Very small HTML → text conversion for job descriptions (no DOM, no script execution). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return htmlToText(og ?? h1 ?? title ?? '').slice(0, 200)
}
