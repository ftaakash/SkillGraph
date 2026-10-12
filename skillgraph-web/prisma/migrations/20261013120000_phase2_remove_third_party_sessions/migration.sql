-- Phase 2 (ADR-001): OpenClaw no longer automates third-party job sites.
-- Permanently delete stored third-party session cookies (Playwright storageState) and drop the column.

-- AlterTable
ALTER TABLE "OpenClawConfig" DROP COLUMN "sessionData";

-- AlterTable
ALTER TABLE "OpenClawApplication" ALTER COLUMN "status" SET DEFAULT 'Pending';

