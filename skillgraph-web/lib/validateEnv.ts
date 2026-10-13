/**
 * lib/validateEnv.ts
 * 
 * Startup environment variable validation.
 * Fails loudly with a descriptive error if critical config is missing.
 * Import this at the top of app/layout.tsx (server component) so it runs at startup.
 */

// productionOnly: development falls back without it (private storage writes to .data/uploads)
const REQUIRED_ENV_VARS: { key: string; description: string; productionOnly?: boolean }[] = [
  { key: 'DATABASE_URL',          description: 'PostgreSQL connection string' },
  { key: 'NEXTAUTH_SECRET',       description: 'NextAuth JWT secret (generate with openssl rand -base64 32)' },
  { key: 'NEXTAUTH_URL',          description: 'Base URL of the application (e.g. http://localhost:3000)' },
  { key: 'OPENAI_API_KEY',        description: 'OpenAI / Groq API key for AI features' },
  { key: 'CLOUDINARY_CLOUD_NAME', description: 'Cloudinary cloud name for file storage', productionOnly: true },
  { key: 'CLOUDINARY_API_KEY',    description: 'Cloudinary API key', productionOnly: true },
  { key: 'CLOUDINARY_API_SECRET', description: 'Cloudinary API secret', productionOnly: true },
];

const OPTIONAL_ENV_VARS: { key: string; description: string }[] = [
  { key: 'RAPIDAPI_KEY',  description: 'RapidAPI key for JSearch fallback scraping' },
  { key: 'RAPIDAPI_HOST', description: 'RapidAPI host (default: jsearch.p.rapidapi.com)' },
  { key: 'ACADEMIC_ENCRYPTION_KEY', description: 'Encrypts university portal sessions (Academics connector)' },
  { key: 'SRM_API_KEY', description: 'Official SRM API key for academic sync' },
  { key: 'ATS_PARTNER_KEYS', description: 'Employer-issued Greenhouse/Lever API keys (JSON) for OpenClaw auto-submit' },
];

export function validateEnv(): void {
  // Only validate in server context (not in Edge or client)
  if (typeof window !== 'undefined') return;

  const missing: string[] = [];

  const production = process.env.NODE_ENV === 'production'
  for (const { key, description, productionOnly } of REQUIRED_ENV_VARS) {
    if (productionOnly && !production) continue
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
