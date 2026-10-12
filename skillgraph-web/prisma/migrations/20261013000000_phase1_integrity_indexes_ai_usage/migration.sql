-- Phase 1 (ADR-001): referential integrity, query indexes, AI usage metering.

-- OpenClawApplication.listingId had no FK in the live database (schema was applied with db push).
-- Remove applications whose listing no longer exists so the constraint can be created;
-- with ON DELETE CASCADE these rows would have been deleted together with their listing anyway.
DELETE FROM "OpenClawApplication" a
WHERE NOT EXISTS (SELECT 1 FROM "OpenClawListing" l WHERE l.id = a."listingId");

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FacultyJobPosting_collegeId_idx" ON "FacultyJobPosting"("collegeId");

-- CreateIndex
CREATE INDEX "InterviewStory_userId_idx" ON "InterviewStory"("userId");

-- CreateIndex
CREATE INDEX "JobApplication_userId_idx" ON "JobApplication"("userId");

-- CreateIndex
CREATE INDEX "JobApplication_jobPostingId_idx" ON "JobApplication"("jobPostingId");

-- CreateIndex
CREATE INDEX "JobPosting_demandWeek_idx" ON "JobPosting"("demandWeek");

-- CreateIndex
CREATE INDEX "NegotiationScript_userId_idx" ON "NegotiationScript"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "OpenClawApplication_userId_status_idx" ON "OpenClawApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "OpenClawApplication_listingId_idx" ON "OpenClawApplication"("listingId");

-- CreateIndex
CREATE INDEX "OptimizerSession_userId_idx" ON "OptimizerSession"("userId");

-- CreateIndex
CREATE INDEX "PlacementRecord_collegeId_idx" ON "PlacementRecord"("collegeId");

-- CreateIndex
CREATE INDEX "RecruiterTalentView_studentId_idx" ON "RecruiterTalentView"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterTalentView_recruiterId_studentId_key" ON "RecruiterTalentView"("recruiterId", "studentId");

-- CreateIndex
CREATE INDEX "ResumeSection_resumeVersionId_idx" ON "ResumeSection"("resumeVersionId");

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_idx" ON "ResumeVersion"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_userId_closed_idx" ON "SkillGap"("userId", "closed");

-- CreateIndex
CREATE INDEX "SkillProfile_userId_idx" ON "SkillProfile"("userId");

-- CreateIndex
CREATE INDEX "Sprint_userId_status_idx" ON "Sprint"("userId", "status");

-- AddForeignKey
ALTER TABLE "OpenClawApplication" ADD CONSTRAINT "OpenClawApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OpenClawListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

