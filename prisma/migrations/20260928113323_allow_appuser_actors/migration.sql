/*
  Warnings:

  - You are about to drop the `BranchCapitalReturn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TellerLedgerEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TellerLedgerType" AS ENUM ('DEPOSIT_COLLECTED', 'WITHDRAWAL_PAID', 'REFUND_PAID', 'MANAGER_FUNDING', 'TELLER_RETURN');

-- DropForeignKey
ALTER TABLE "BranchCapitalReturn" DROP CONSTRAINT "BranchCapitalReturn_branchId_fkey";

-- DropForeignKey
ALTER TABLE "BranchCapitalReturn" DROP CONSTRAINT "BranchCapitalReturn_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "TellerLedgerEntry" DROP CONSTRAINT "TellerLedgerEntry_tellerId_fkey";

-- DropForeignKey
ALTER TABLE "branch" DROP CONSTRAINT "branch_created_by_super_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_paid_by_fkey";

-- DropForeignKey
ALTER TABLE "fund_source" DROP CONSTRAINT "fund_source_recorded_by_fkey";

-- DropForeignKey
ALTER TABLE "partner_distribution" DROP CONSTRAINT "partner_distribution_recorded_by_fkey";

-- DropForeignKey
ALTER TABLE "salary_payment" DROP CONSTRAINT "salary_payment_paid_by_fkey";

-- DropForeignKey
ALTER TABLE "topup" DROP CONSTRAINT "topup_initiated_by_fkey";

-- AlterTable
ALTER TABLE "branch" ADD COLUMN     "created_by_user_id" TEXT,
ALTER COLUMN "created_by_super_admin_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "paid_by_user" TEXT,
ALTER COLUMN "paid_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "fund_source" ADD COLUMN     "recorded_by_user" TEXT,
ALTER COLUMN "recorded_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "partner" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "partner_distribution" ADD COLUMN     "recorded_by_user" TEXT,
ALTER COLUMN "recorded_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "salary_payment" ADD COLUMN     "paid_by_user" TEXT,
ALTER COLUMN "paid_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "topup" ADD COLUMN     "initiated_by_user" TEXT,
ALTER COLUMN "initiated_by" DROP NOT NULL;

-- DropTable
DROP TABLE "BranchCapitalReturn";

-- DropTable
DROP TABLE "TellerLedgerEntry";

-- DropEnum
DROP TYPE "TellerLedgerEntryType";

-- CreateTable
CREATE TABLE "teller_ledger_entry" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "type" "TellerLedgerType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "givenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teller_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_capital_return" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_capital_return_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teller_ledger_entry_tellerId_createdAt_idx" ON "teller_ledger_entry"("tellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_created_by_super_admin_id_fkey" FOREIGN KEY ("created_by_super_admin_id") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup" ADD CONSTRAINT "topup_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup" ADD CONSTRAINT "topup_initiated_by_user_fkey" FOREIGN KEY ("initiated_by_user") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_paid_by_user_fkey" FOREIGN KEY ("paid_by_user") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment" ADD CONSTRAINT "salary_payment_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment" ADD CONSTRAINT "salary_payment_paid_by_user_fkey" FOREIGN KEY ("paid_by_user") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_source" ADD CONSTRAINT "fund_source_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_source" ADD CONSTRAINT "fund_source_recorded_by_user_fkey" FOREIGN KEY ("recorded_by_user") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_recorded_by_user_fkey" FOREIGN KEY ("recorded_by_user") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teller_ledger_entry" ADD CONSTRAINT "teller_ledger_entry_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_capital_return" ADD CONSTRAINT "branch_capital_return_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_capital_return" ADD CONSTRAINT "branch_capital_return_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
