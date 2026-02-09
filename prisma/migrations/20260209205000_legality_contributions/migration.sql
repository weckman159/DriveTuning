-- CreateTable
CREATE TABLE "LegalityContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modificationId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "approvalNumber" TEXT,
    "inspectionOrg" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalityContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalityContribution_status_idx" ON "LegalityContribution"("status");

-- CreateIndex
CREATE INDEX "LegalityContribution_modificationId_idx" ON "LegalityContribution"("modificationId");

-- CreateIndex
CREATE INDEX "LegalityContribution_userId_idx" ON "LegalityContribution"("userId");

-- CreateIndex
CREATE INDEX "LegalityContribution_createdAt_idx" ON "LegalityContribution"("createdAt");

-- AddForeignKey
ALTER TABLE "LegalityContribution" ADD CONSTRAINT "LegalityContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalityContribution" ADD CONSTRAINT "LegalityContribution_modificationId_fkey" FOREIGN KEY ("modificationId") REFERENCES "Modification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

