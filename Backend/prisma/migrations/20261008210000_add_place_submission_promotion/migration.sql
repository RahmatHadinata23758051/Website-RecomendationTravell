-- Persist canonical catalog publication state for approved submissions.
ALTER TABLE "place_submissions"
  ADD COLUMN "canonicalId" TEXT,
  ADD COLUMN "promotedAt" TIMESTAMP(3),
  ADD COLUMN "promotionError" TEXT;

CREATE UNIQUE INDEX "place_submissions_canonicalId_key"
  ON "place_submissions"("canonicalId");
