import { prisma } from "@/lib/prisma";

export async function getBranchCashPosition(branchId: string) {
  const [received, funded, returned, capitalReturned, managerRows] = await Promise.all([
    prisma.partnerDistribution.aggregate({
      where: { branchId },
      _sum: { amount: true },
    }),
    prisma.tellerLedgerEntry.aggregate({
      where: { type: "MANAGER_FUNDING" as any, teller: { branchId } },
      _sum: { amount: true },
    }),
    prisma.tellerLedgerEntry.aggregate({
      where: { type: "TELLER_RETURN" as any, teller: { branchId } },
      _sum: { amount: true },
    }),
    prisma.branchCapitalReturn.aggregate({
      where: { branchId },
      _sum: { amount: true },
    }),
    prisma.tellerLedgerEntry.groupBy({
      by: ["type"],
      where: {
        type: { in: ["DEPOSIT_COLLECTED", "WITHDRAWAL_PAID", "REFUND_PAID"] as any },
        teller: { branchId, role: "BRANCH_MANAGER" as any },
      },
      _sum: { amount: true },
    }),
  ]);

  const receivedFromPartners = Number(received._sum.amount ?? 0);
  const fundedToTellers = Number(funded._sum.amount ?? 0);
  const returnedByTellers = Number(returned._sum.amount ?? 0);
  const capitalReturnedToPartners = Number(capitalReturned._sum.amount ?? 0);

  let managerDeposits = 0;
  let managerPayouts = 0;
  for (const r of managerRows) {
    const sum = Number(r._sum.amount ?? 0);
    if (r.type === "DEPOSIT_COLLECTED") managerDeposits += sum;
    else managerPayouts += sum;
  }

  const cashPosition =
    receivedFromPartners -
    fundedToTellers +
    returnedByTellers -
    capitalReturnedToPartners +
    managerDeposits -
    managerPayouts;

  return {
    receivedFromPartners,
    fundedToTellers,
    returnedByTellers,
    capitalReturnedToPartners,
    managerDeposits,
    managerPayouts,
    cashPosition,
  };
}