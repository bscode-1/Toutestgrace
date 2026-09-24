/*
  Warnings:

  - Added the required column `total_charged` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommissionMode" AS ENUM ('DEDUCTED', 'PAID_BY_SENDER');

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "commission_mode" "CommissionMode" NOT NULL DEFAULT 'DEDUCTED',
ADD COLUMN     "total_charged" DECIMAL(18,2);

-- Backfill existing rows: pre-existing transactions were implicitly "deducted" mode,
-- so the amount charged at the counter equals the amount sent.
UPDATE "transaction" SET "total_charged" = "amount_sent" WHERE "total_charged" IS NULL;

-- Now that every row has a value, enforce NOT NULL
ALTER TABLE "transaction" ALTER COLUMN "total_charged" SET NOT NULL;