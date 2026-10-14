import { prisma } from "./prisma";
import { calculateBranchCapital } from "./branch-capital";

export interface BranchSituation {
  branchId: string;
  name: string;
  status: string;
  // period flows (filtered by date range)
  partnerReceived: number;
  capitalReturned: number;
  deposits: number;
  refunds: number;
  withdrawals: number;
  commission: number;
  expenses: number;
  salaries: number;
  netProfit: number;
  // balances (always current)
  managerCash: number;
  tellerCash: number;
  cashOnHand: number;
  cashToReturn: number;
}

const CREDITS = ["DEPOSIT_COLLECTED", "MANAGER_FUNDING"];
const n = (v: unknown) => Number(v ?? 0);

export async function getAllBranchesSituation(
  from?: Date,
  to?: Date
): Promise<BranchSituation[]> {
  const r = from || to ? { gte: from, lte: to } : undefined;

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    branches.map(async (b) => {
      const [cap, staff] = await Promise.all([
        calculateBranchCapital(b.id),
        prisma.appUser.findMany({
          where: { branchId: b.id },
          select: { id: true, role: true },
        }),
      ]);
      const staffIds = staff.map((s) => s.id);
      const tellerIds = staff.filter((s) => s.role === "TELLER").map((s) => s.id);

      const [ledger, dep, ref, com, wd, pr, cr, exp, sal] = await Promise.all([
        tellerIds.length
          ? prisma.tellerLedgerEntry.groupBy({
              by: ["type"],
              where: { tellerId: { in: tellerIds } },
              _sum: { amount: true },
            })
          : Promise.resolve([] as { type: string; _sum: { amount: any } }[]),
        prisma.transaction.aggregate({
          where: { senderBranchId: b.id, createdAt: r },
          _sum: { totalCharged: true },
        }),
        prisma.transaction.aggregate({
          where: { senderBranchId: b.id, status: "REFUNDED", createdAt: r },
          _sum: { totalCharged: true },
        }),
        prisma.transaction.aggregate({
          where: { senderBranchId: b.id, status: { not: "REFUNDED" }, createdAt: r },
          _sum: { commissionAmount: true },
        }),
        prisma.pickupEvent.aggregate({
          where: { transaction: { receiverBranchId: b.id }, createdAt: r },
          _sum: { amount: true },
        }),
        prisma.partnerDistribution.aggregate({
          where: { branchId: b.id, createdAt: r },
          _sum: { amount: true },
        }),
        prisma.branchCapitalReturn.aggregate({
          where: { branchId: b.id, recordedAt: r },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { branchId: b.id, createdAt: r },
          _sum: { amount: true },
        }),
        staffIds.length
          ? prisma.salaryPayment.aggregate({
              where: { staffId: { in: staffIds }, paidAt: r },
              _sum: { amount: true },
            })
          : Promise.resolve(null),
      ]);

      const sum = (type: string) =>
        n(ledger.find((l) => l.type === type)?._sum.amount);

      const funding = sum("MANAGER_FUNDING");
      const tellerReturns = sum("TELLER_RETURN");
      const tellerCash = ledger.reduce((acc, l) => {
        const v = n(l._sum.amount);
        return acc + (CREDITS.includes(l.type) ? v : -v);
      }, 0);

      // balances use all-time figures
      const managerCash =
        cap.partnerReceived - funding + tellerReturns - cap.alreadyReturned;

      const commission = n(com._sum.commissionAmount);
      const expenses = n(exp._sum.amount);
      const salaries = n(sal?._sum?.amount);

      return {
        branchId: b.id,
        name: b.name,
        status: String(b.status),
        partnerReceived: n(pr._sum.amount),
        capitalReturned: n(cr._sum.amount),
        deposits: n(dep._sum.totalCharged),
        refunds: n(ref._sum.totalCharged),
        withdrawals: n(wd._sum.amount),
        commission,
        expenses,
        salaries,
        netProfit: commission - expenses - salaries,
        managerCash,
        tellerCash,
        cashOnHand: managerCash + tellerCash,
        cashToReturn: cap.outstanding,
      };
    })
  );
}