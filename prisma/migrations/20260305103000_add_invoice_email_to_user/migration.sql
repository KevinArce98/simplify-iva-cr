-- AlterTable
ALTER TABLE "User" ADD COLUMN "invoiceEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_invoiceEmail_key" ON "User"("invoiceEmail");
