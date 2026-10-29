-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('SEEDS', 'FERTILISER', 'AGROCHEMICALS', 'TOOLS', 'MACHINERY', 'EQUIPMENT_HIRE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'HIDDEN');

-- CreateTable
CREATE TABLE "SupplierListing" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "category" "SupplierCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceMinor" INTEGER,
    "unit" TEXT,
    "photos" TEXT[],
    "contactPhone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DistrictToSupplierListing" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DistrictToSupplierListing_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SupplierListing_category_status_idx" ON "SupplierListing"("category", "status");

-- CreateIndex
CREATE INDEX "SupplierListing_orgId_idx" ON "SupplierListing"("orgId");

-- CreateIndex
CREATE INDEX "_DistrictToSupplierListing_B_index" ON "_DistrictToSupplierListing"("B");

-- AddForeignKey
ALTER TABLE "SupplierListing" ADD CONSTRAINT "SupplierListing_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DistrictToSupplierListing" ADD CONSTRAINT "_DistrictToSupplierListing_A_fkey" FOREIGN KEY ("A") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DistrictToSupplierListing" ADD CONSTRAINT "_DistrictToSupplierListing_B_fkey" FOREIGN KEY ("B") REFERENCES "SupplierListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
