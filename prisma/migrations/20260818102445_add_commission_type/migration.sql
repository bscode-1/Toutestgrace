-- AlterTable
ALTER TABLE "commission_tier" ADD COLUMN     "commission_flat_amount" DECIMAL(18,2),
ADD COLUMN     "commission_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
ALTER COLUMN "commission_percent" DROP NOT NULL;
