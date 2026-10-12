// Test environment: no network credentials, no real database writes.
process.env.OPENAI_API_KEY ??= 'test-key'
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test'
delete process.env.CLOUDINARY_CLOUD_NAME
delete process.env.RATE_LIMIT_REDIS_URL
