import { prisma } from "./prisma";

export interface BranchCapitalBreakdown {
  partnerReceived: number;
  totalDeposits: number;
  totalRefunds: number;
  totalCommission: number;
  totalWithdrawals: number;
  alreadyReturned: number;
  outstanding: number;
}

export async function calculateBranchCapital(branchId: string): Promise<BranchCapitalBreakdown> {
  const [partnerAgg, depositsAgg, refundsAgg, commissionAgg, withdrawalsAgg, returnedAgg] =
    await Promise.all([
      // cash received from partners (same source branch-cash.ts uses for "distributions received")
      prisma.partnerDistribution.aggregate({
        where: { branchId },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { senderBranchId: branchId },
        _sum: { totalCharged: true },
      }),
      prisma.transaction.aggregate({
        where: { senderBranchId: branchId, status: "REFUNDED" },
        _sum: { totalCharged: true },
      }),
      prisma.transaction.aggregate({
        where: { senderBranchId: branchId, status: { not: "REFUNDED" } },
        _sum: { commissionAmount: true },
      }),
      prisma.pickupEvent.aggregate({
        where: { transaction: { receiverBranchId: branchId } },
        _sum: { amount: true },
      }),
      prisma.branchCapitalReturn.aggregate({
        where: { branchId },
        _sum: { amount: true },
      }),
    ]);

  const partnerReceived = Number(partnerAgg._sum.amount ?? 0);
  const totalDeposits = Number(depositsAgg._sum.totalCharged ?? 0);
  const totalRefunds = Number(refundsAgg._sum.totalCharged ?? 0);
  const totalCommission = Number(commissionAgg._sum.commissionAmount ?? 0);
  const totalWithdrawals = Number(withdrawalsAgg._sum.amount ?? 0);
  const alreadyReturned = Number(returnedAgg._sum.amount ?? 0);

  // Cash to return = partner cash + (customer deposits - withdrawals),
  // minus refunds paid back, commission the branch keeps, and capital already returned
  const outstanding =
    partnerReceived +
    (totalDeposits - totalWithdrawals) -
    totalRefunds -
    totalCommission -
    alreadyReturned;

  return {
    partnerReceived,
    totalDeposits,
    totalRefunds,
    totalCommission,
    totalWithdrawals,
    alreadyReturned,
    outstanding,
  };
}