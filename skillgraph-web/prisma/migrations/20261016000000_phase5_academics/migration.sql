-- AlterTable
ALTER TABLE "FacultyJobPosting" ADD COLUMN     "applyUrl" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'on_campus',
ADD COLUMN     "stipendMax" INTEGER,
ADD COLUMN     "stipendMin" INTEGER,
ADD COLUMN     "visitMode" TEXT;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'skillgraph';

-- CreateTable
CREATE TABLE "AcademicConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sessionCiphertext" TEXT,
    "sessionExpiresAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicProfile" (
    "userId" TEXT NOT NULL,
    "regNo" TEXT,
    "program" TEXT,
    "department" TEXT,
    "semester" INTEGER,
    "section" TEXT,
    "batch" TEXT,
    "timetable" JSONB,
    "calendar" JSONB,
    "source" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AcademicCourse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "credits" DOUBLE PRECISION,
    "faculty" TEXT,
    "slot" TEXT,
    "room" TEXT,
    "attended" INTEGER NOT NULL DEFAULT 0,
    "conducted" INTEGER NOT NULL DEFAULT 0,
    "marks" JSONB,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLeave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegeCalendarDay" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayOrder" INTEGER,
    "label" TEXT,

    CONSTRAINT "CollegeCalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicConnection_userId_key" ON "AcademicConnection"("userId");

-- CreateIndex
CREATE INDEX "AcademicProfile_regNo_idx" ON "AcademicProfile"("regNo");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCourse_userId_code_category_key" ON "AcademicCourse"("userId", "code", "category");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLeave_userId_date_key" ON "AttendanceLeave"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeCalendarDay_collegeId_date_key" ON "CollegeCalendarDay"("collegeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyJobPosting_collegeId_externalRef_key" ON "FacultyJobPosting"("collegeId", "externalRef");

-- AddForeignKey
ALTER TABLE "AcademicConnection" ADD CONSTRAINT "AcademicConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicProfile" ADD CONSTRAINT "AcademicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCourse" ADD CONSTRAINT "AcademicCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLeave" ADD CONSTRAINT "AttendanceLeave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeCalendarDay" ADD CONSTRAINT "CollegeCalendarDay_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "CollegeInstitution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

