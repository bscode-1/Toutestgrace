-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "amount_collected" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "parent_transaction_id" TEXT;

-- CreateTable
CREATE TABLE "fund_source" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "commodity_name" TEXT NOT NULL,
    "cash_value" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_distribution" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "topup_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "distributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_distribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_distribution_topup_id_key" ON "partner_distribution"("topup_id");

-- AddForeignKey
ALTER TABLE "fund_source" ADD CONSTRAINT "fund_source_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_source" ADD CONSTRAINT "fund_source_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "super_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_topup_id_fkey" FOREIGN KEY ("topup_id") REFERENCES "topup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "super_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
