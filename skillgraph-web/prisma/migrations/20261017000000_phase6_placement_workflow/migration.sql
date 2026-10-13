-- AlterTable
ALTER TABLE "FacultyJobPosting" ADD COLUMN     "batchYear" INTEGER,
ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "DriveRound" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "mode" TEXT,
    "venue" TEXT,
    "attendanceCode" TEXT,
    "attendanceUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriveRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "confirmation" TEXT NOT NULL DEFAULT 'pending',
    "respondedAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "attendanceMethod" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "jobPostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeRead" (
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("noticeId","userId")
);

-- CreateTable
CREATE TABLE "DriveMessage" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "replyToId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriveRound_jobPostingId_position_idx" ON "DriveRound"("jobPostingId", "position");

-- CreateIndex
CREATE INDEX "DriveRound_startsAt_idx" ON "DriveRound"("startsAt");

-- CreateIndex
CREATE INDEX "RoundResult_applicationId_idx" ON "RoundResult"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_roundId_applicationId_key" ON "RoundResult"("roundId", "applicationId");

-- CreateIndex
CREATE INDEX "Notice_collegeId_createdAt_idx" ON "Notice"("collegeId", "createdAt");

-- CreateIndex
CREATE INDEX "NoticeRead_userId_idx" ON "NoticeRead"("userId");

-- CreateIndex
CREATE INDEX "DriveMessage_jobPostingId_createdAt_idx" ON "DriveMessage"("jobPostingId", "createdAt");

-- AddForeignKey
ALTER TABLE "DriveRound" ADD CONSTRAINT "DriveRound_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "FacultyJobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "DriveRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "CollegeInstitution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "FacultyJobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveMessage" ADD CONSTRAINT "DriveMessage_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "FacultyJobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveMessage" ADD CONSTRAINT "DriveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

