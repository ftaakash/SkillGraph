import type { NextConfig } from "next";

// Baseline security headers applied to every response. A full Content-Security-Policy
// (script/style sources) is tracked in docs/adr/ADR-001 — only frame-ancestors is set
// here so existing inline styles, embeds and Cloudinary assets keep working.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['playwright', 'playwright-extra', 'puppeteer-extra-plugin-stealth', 'bull', 'ioredis', 'openai', 'pdf-parse'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
