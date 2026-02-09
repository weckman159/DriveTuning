-- Add basic DE/EU event metadata for legality/regional checks
ALTER TABLE "Event"
ADD COLUMN     "stateId" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Event_stateId_idx" ON "Event"("stateId");
CREATE INDEX "Event_visibility_idx" ON "Event"("visibility");

