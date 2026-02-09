-- AlterTable
ALTER TABLE "Car"
ADD COLUMN     "stateId" TEXT,
ADD COLUMN     "registrationPlate" TEXT;

-- CreateIndex
CREATE INDEX "Car_stateId_idx" ON "Car"("stateId");

-- AlterTable
ALTER TABLE "Modification"
ADD COLUMN     "userParametersJson" TEXT;

