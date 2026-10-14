-- DropForeignKey
ALTER TABLE "partner_distribution" DROP CONSTRAINT "partner_distribution_fund_source_id_fkey";

-- AlterTable
ALTER TABLE "partner_distribution" ALTER COLUMN "fund_source_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "fund_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;