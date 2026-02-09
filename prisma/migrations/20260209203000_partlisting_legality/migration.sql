-- AlterTable
ALTER TABLE "PartListing"
ADD COLUMN     "legalityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "legalityApprovalType" TEXT,
ADD COLUMN     "legalityApprovalNumber" TEXT,
ADD COLUMN     "legalitySourceId" TEXT,
ADD COLUMN     "legalitySourceUrl" TEXT,
ADD COLUMN     "legalityNotes" TEXT,
ADD COLUMN     "legalityLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "isFullyLegal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresRegistration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresInspection" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PartListing_legalityStatus_idx" ON "PartListing"("legalityStatus");

-- CreateIndex
CREATE INDEX "PartListing_legalityApprovalType_idx" ON "PartListing"("legalityApprovalType");

-- CreateIndex
CREATE INDEX "PartListing_legalityApprovalNumber_idx" ON "PartListing"("legalityApprovalNumber");

-- CreateIndex
CREATE INDEX "PartListing_isFullyLegal_idx" ON "PartListing"("isFullyLegal");

-- CreateIndex
CREATE INDEX "PartListing_requiresRegistration_idx" ON "PartListing"("requiresRegistration");

-- CreateIndex
CREATE INDEX "PartListing_requiresInspection_idx" ON "PartListing"("requiresInspection");

