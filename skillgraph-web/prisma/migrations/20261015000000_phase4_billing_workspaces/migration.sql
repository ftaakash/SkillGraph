-- Phase 4 (ADR-001): Razorpay billing, college workspaces (join codes, admins).

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "collegeJoinedAt" TIMESTAMP(3),
ADD COLUMN     "isCollegeAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CollegeInstitution" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "facultyInviteCode" TEXT,
ADD COLUMN     "joinCode" TEXT;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "seats" INTEGER,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerOrderId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "purchasedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerOrderId_key" ON "Subscription"("providerOrderId");

-- CreateIndex
CREATE INDEX "Subscription_ownerType_ownerId_status_idx" ON "Subscription"("ownerType", "ownerId", "status");

-- CreateIndex
CREATE INDEX "Subscription_status_periodEnd_idx" ON "Subscription"("status", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeInstitution_joinCode_key" ON "CollegeInstitution"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeInstitution_facultyInviteCode_key" ON "CollegeInstitution"("facultyInviteCode");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The faculty member who created each existing college becomes its workspace admin.
UPDATE "User" u SET "isCollegeAdmin" = true
WHERE u."role" = 'FACULTY' AND u."collegeId" IS NOT NULL
  AND u."createdAt" = (SELECT min(f."createdAt") FROM "User" f WHERE f."role" = 'FACULTY' AND f."collegeId" = u."collegeId");
