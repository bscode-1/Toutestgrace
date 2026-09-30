import { prisma } from "@/lib/prisma";

export async function getBranchCashPosition(branchId: string) {
  const [received, funded, returned, capitalReturned] = await Promise.all([
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
  ]);

  const receivedFromPartners = Number(received._sum.amount ?? 0);
  const fundedToTellers = Number(funded._sum.amount ?? 0);
  const returnedByTellers = Number(returned._sum.amount ?? 0);
  const capitalReturnedToPartners = Number(capitalReturned._sum.amount ?? 0);

  const cashPosition =
    receivedFromPartners - fundedToTellers + returnedByTellers - capitalReturnedToPartners;

  return {
    receivedFromPartners,
    fundedToTellers,
    returnedByTellers,
    capitalReturnedToPartners,
    cashPosition,
  };
}