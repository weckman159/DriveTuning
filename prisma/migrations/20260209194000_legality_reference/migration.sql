-- CreateTable
CREATE TABLE "LegalityReference" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "vehicleCompatibility" TEXT,
    "approvalType" TEXT NOT NULL,
    "approvalNumber" TEXT,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "restrictionsJson" TEXT,
    "notesDe" TEXT,
    "notesEn" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalityReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalityReference_fingerprint_key" ON "LegalityReference"("fingerprint");

-- CreateIndex
CREATE INDEX "LegalityReference_brand_idx" ON "LegalityReference"("brand");

-- CreateIndex
CREATE INDEX "LegalityReference_category_idx" ON "LegalityReference"("category");

-- CreateIndex
CREATE INDEX "LegalityReference_subcategory_idx" ON "LegalityReference"("subcategory");

-- CreateIndex
CREATE INDEX "LegalityReference_approvalType_idx" ON "LegalityReference"("approvalType");

-- CreateIndex
CREATE INDEX "LegalityReference_approvalNumber_idx" ON "LegalityReference"("approvalNumber");

-- AlterTable
ALTER TABLE "Modification" ADD COLUMN     "legalityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "legalityApprovalType" TEXT,
ADD COLUMN     "legalityApprovalNumber" TEXT,
ADD COLUMN     "legalitySourceId" TEXT,
ADD COLUMN     "legalitySourceUrl" TEXT,
ADD COLUMN     "legalityNotes" TEXT,
ADD COLUMN     "legalityLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "legalityReferenceId" TEXT;

-- CreateIndex
CREATE INDEX "Modification_legalityStatus_idx" ON "Modification"("legalityStatus");

-- CreateIndex
CREATE INDEX "Modification_legalityApprovalType_idx" ON "Modification"("legalityApprovalType");

-- CreateIndex
CREATE INDEX "Modification_legalityApprovalNumber_idx" ON "Modification"("legalityApprovalNumber");

-- CreateIndex
CREATE INDEX "Modification_legalityReferenceId_idx" ON "Modification"("legalityReferenceId");

-- AddForeignKey
ALTER TABLE "Modification" ADD CONSTRAINT "Modification_legalityReferenceId_fkey" FOREIGN KEY ("legalityReferenceId") REFERENCES "LegalityReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

