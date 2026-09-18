/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `fund_source` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `fund_source` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fund_source_id` to the `partner_distribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fund_source" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "partner_distribution" ADD COLUMN     "fund_source_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "fund_source_code_key" ON "fund_source"("code");

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "fund_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
