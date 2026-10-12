// Test environment: no network credentials, and never a real database.
// Integration tests use TEST_DATABASE_URL (a disposable local Postgres) and are skipped without it.
process.env.OPENAI_API_KEY ??= 'test-key'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@127.0.0.1:5432/unused'
delete process.env.CLOUDINARY_CLOUD_NAME
delete process.env.RATE_LIMIT_REDIS_URL
