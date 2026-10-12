-- Phase 3 (ADR-001): email verification & password reset tokens, session invalidation,
-- terms consent records, and mutual-consent recruiter reveal.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "RecruiterTalentView" ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "revealStatus" TEXT NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Emails are compared case-insensitively from now on; normalise any stored values.
UPDATE "User" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

-- Existing shortlists were never consented to by the student: treat them as pending requests.
UPDATE "RecruiterTalentView" SET "revealStatus" = 'requested', "requestedAt" = COALESCE("revealedAt", "viewedAt"), "revealedAt" = NULL WHERE "shortlisted" = true;
