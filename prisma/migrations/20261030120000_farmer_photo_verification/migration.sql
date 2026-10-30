-- CreateEnum
CREATE TYPE "FarmerVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FarmerPhotoType" AS ENUM ('FARM', 'ID_CARD', 'SELFIE');

-- AlterTable
ALTER TABLE "FarmerProfile" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verificationStatus" "FarmerVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "verificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- CreateTable
CREATE TABLE "FarmerPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FarmerPhotoType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmerPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerPhoto_fileKey_key" ON "FarmerPhoto"("fileKey");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerPhoto_userId_type_key" ON "FarmerPhoto"("userId", "type");

-- CreateIndex
CREATE INDEX "FarmerProfile_verificationStatus_verificationSubmittedAt_idx" ON "FarmerProfile"("verificationStatus", "verificationSubmittedAt");

-- AddForeignKey
ALTER TABLE "FarmerPhoto" ADD CONSTRAINT "FarmerPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "FarmerProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

