-- CreateEnum
CREATE TYPE "GuideSection" AS ENUM ('OVERVIEW', 'PLANTING_CALENDAR', 'SOIL', 'FERTILISER', 'PESTS', 'DISEASES', 'HARVEST', 'STORAGE');

-- CreateTable
CREATE TABLE "WeatherCache" (
    "districtId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "forecast" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("districtId")
);

-- CreateTable
CREATE TABLE "CropGuide" (
    "id" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "section" "GuideSection" NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CropGuide_published_idx" ON "CropGuide"("published");

-- CreateIndex
CREATE UNIQUE INDEX "CropGuide_cropId_section_key" ON "CropGuide"("cropId", "section");

-- AddForeignKey
ALTER TABLE "WeatherCache" ADD CONSTRAINT "WeatherCache_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuide" ADD CONSTRAINT "CropGuide_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuide" ADD CONSTRAINT "CropGuide_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuide" ADD CONSTRAINT "CropGuide_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
