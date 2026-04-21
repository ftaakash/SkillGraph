/**
 * lib/validateEnv.ts
 * 
 * Startup environment variable validation.
 * Fails loudly with a descriptive error if critical config is missing.
 * Import this at the top of app/layout.tsx (server component) so it runs at startup.
 */

const REQUIRED_ENV_VARS: { key: string; description: string }[] = [
  { key: 'DATABASE_URL',          description: 'PostgreSQL connection string' },
  { key: 'NEXTAUTH_SECRET',       description: 'NextAuth JWT secret (generate with openssl rand -base64 32)' },
  { key: 'NEXTAUTH_URL',          description: 'Base URL of the application (e.g. http://localhost:3000)' },
  { key: 'OPENAI_API_KEY',        description: 'OpenAI / Groq API key for AI features' },
  { key: 'CLOUDINARY_CLOUD_NAME', description: 'Cloudinary cloud name for file storage' },
  { key: 'CLOUDINARY_API_KEY',    description: 'Cloudinary API key' },
  { key: 'CLOUDINARY_API_SECRET', description: 'Cloudinary API secret' },
];

const OPTIONAL_ENV_VARS: { key: string; description: string }[] = [
  { key: 'RAPIDAPI_KEY',  description: 'RapidAPI key for JSearch fallback scraping' },
  { key: 'RAPIDAPI_HOST', description: 'RapidAPI host (default: jsearch.p.rapidapi.com)' },
];

export function validateEnv(): void {
  // Only validate in server context (not in Edge or client)
  if (typeof window !== 'undefined') return;

  const missing: string[] = [];

  for (const { key, description } of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(`  ❌  ${key.padEnd(28)} — ${description}`);
    }
  }

  if (missing.length > 0) {
    const lines = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║         SkillGraph — Missing Environment Variables           ║',
      '╠══════════════════════════════════════════════════════════════╣',
      '║  The following required environment variables are not set.   ║',
      '║  Add them to skillgraph-web/.env.local before starting.      ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      ...missing,
      '',
      '  Optional (degraded functionality if missing):',
      ...OPTIONAL_ENV_VARS
        .filter(({ key }) => !process.env[key])
        .map(({ key, description }) => `  ⚠️   ${key.padEnd(28)} — ${description}`),
      '',
    ];
    throw new Error(lines.join('\n'));
  }
}
