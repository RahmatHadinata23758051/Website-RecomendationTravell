-- AlterEnum
ALTER TYPE "PlaceSubmissionStatus" ADD VALUE IF NOT EXISTS 'PROMOTION_FAILED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "place_submission_audit_logs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "fromStatus" "PlaceSubmissionStatus" NOT NULL,
    "toStatus" "PlaceSubmissionStatus" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_submission_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "place_submission_audit_logs_submissionId_createdAt_idx" ON "place_submission_audit_logs"("submissionId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'place_submission_audit_logs_submissionId_fkey'
    ) THEN
        ALTER TABLE "place_submission_audit_logs" ADD CONSTRAINT "place_submission_audit_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "place_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'place_submission_audit_logs_moderatorId_fkey'
    ) THEN
        ALTER TABLE "place_submission_audit_logs" ADD CONSTRAINT "place_submission_audit_logs_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
