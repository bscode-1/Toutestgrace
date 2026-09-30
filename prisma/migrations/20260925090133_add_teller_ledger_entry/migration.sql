-- CreateEnum
CREATE TYPE "TellerLedgerEntryType" AS ENUM ('DEPOSIT_COLLECTED', 'WITHDRAWAL_PAID', 'REFUND_PAID', 'MANAGER_FUNDING');

-- CreateTable
CREATE TABLE "TellerLedgerEntry" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "type" "TellerLedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "givenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TellerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchCapitalReturn" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchCapitalReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TellerLedgerEntry_tellerId_createdAt_idx" ON "TellerLedgerEntry"("tellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "TellerLedgerEntry" ADD CONSTRAINT "TellerLedgerEntry_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCapitalReturn" ADD CONSTRAINT "BranchCapitalReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCapitalReturn" ADD CONSTRAINT "BranchCapitalReturn_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
