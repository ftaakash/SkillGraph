-- ADR-004: OpenClaw job filters, opt-in ATS auto-submit, and how each application was submitted
ALTER TABLE "OpenClawConfig" ADD COLUMN "includeKeywords" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "OpenClawConfig" ADD COLUMN "excludeKeywords" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "OpenClawConfig" ADD COLUMN "autoSubmit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OpenClawApplication" ADD COLUMN "submittedVia" TEXT;
ALTER TABLE "OpenClawApplication" ADD COLUMN "externalRef" TEXT;
