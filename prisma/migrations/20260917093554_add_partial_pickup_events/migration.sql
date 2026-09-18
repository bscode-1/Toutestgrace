-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED');

-- CreateTable
CREATE TABLE "pickup_event" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "collected_by_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pickup_event_receipt_number_key" ON "pickup_event"("receipt_number");

-- AddForeignKey
ALTER TABLE "pickup_event" ADD CONSTRAINT "pickup_event_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_event" ADD CONSTRAINT "pickup_event_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
