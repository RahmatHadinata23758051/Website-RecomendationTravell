-- PlaceSubmit submission workflow
-- Existing application tables (users, reviews, etc.) are intentionally not recreated here.

CREATE TYPE "PlaceSubmissionStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_MORE_INFO',
  'DUPLICATE'
);

CREATE TYPE "PlaceSubmissionSource" AS ENUM (
  'USER',
  'OWNER_CLAIMED',
  'COMMUNITY'
);

CREATE TYPE "SubmissionVoteType" AS ENUM (
  'UPVOTE',
  'DOWNVOTE',
  'VERIFY',
  'FLAG_DUPLICATE',
  'FLAG_INACCURATE'
);

CREATE TABLE "place_submissions" (
  "id" TEXT NOT NULL,
  "submitterId" TEXT,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "categoryTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "address" TEXT NOT NULL,
  "cityRegency" TEXT NOT NULL,
  "district" TEXT,
  "village" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "description" TEXT,
  "openingHours" JSONB,
  "priceMin" INTEGER,
  "priceMax" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "facilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "photos" JSONB,
  "primaryPhotoUrl" TEXT,
  "ownershipProof" JSONB,
  "isVerifiedOwner" BOOLEAN NOT NULL DEFAULT false,
  "status" "PlaceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "source" "PlaceSubmissionSource" NOT NULL DEFAULT 'USER',
  "moderatorId" TEXT,
  "moderationNotes" TEXT,
  "rejectionReason" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "duplicateOfId" TEXT,
  "duplicateConfidence" DOUBLE PRECISION,
  "duplicateNotes" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "place_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "place_submission_votes" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voteType" "SubmissionVoteType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "place_submission_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "place_submission_comments" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "place_submission_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "place_submissions_status_idx" ON "place_submissions"("status");
CREATE INDEX "place_submissions_cityRegency_status_idx" ON "place_submissions"("cityRegency", "status");
CREATE INDEX "place_submissions_status_submittedAt_idx" ON "place_submissions"("status", "submittedAt");
CREATE INDEX "place_submissions_submitterId_status_idx" ON "place_submissions"("submitterId", "status");
CREATE INDEX "place_submissions_normalizedName_cityRegency_idx" ON "place_submissions"("normalizedName", "cityRegency");
CREATE INDEX "place_submission_votes_submissionId_voteType_idx" ON "place_submission_votes"("submissionId", "voteType");
CREATE UNIQUE INDEX "place_submission_votes_submissionId_userId_voteType_key" ON "place_submission_votes"("submissionId", "userId", "voteType");
CREATE INDEX "place_submission_comments_submissionId_createdAt_idx" ON "place_submission_comments"("submissionId", "createdAt");

ALTER TABLE "place_submissions"
  ADD CONSTRAINT "place_submissions_submitterId_fkey"
  FOREIGN KEY ("submitterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "place_submissions"
  ADD CONSTRAINT "place_submissions_moderatorId_fkey"
  FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "place_submission_votes"
  ADD CONSTRAINT "place_submission_votes_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "place_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "place_submission_votes"
  ADD CONSTRAINT "place_submission_votes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "place_submission_comments"
  ADD CONSTRAINT "place_submission_comments_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "place_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "place_submission_comments"
  ADD CONSTRAINT "place_submission_comments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
