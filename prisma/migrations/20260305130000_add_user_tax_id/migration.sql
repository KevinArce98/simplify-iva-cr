-- AlterTable
ALTER TABLE "User"
ADD COLUMN "taxId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_taxId_key" ON "User"("taxId");
