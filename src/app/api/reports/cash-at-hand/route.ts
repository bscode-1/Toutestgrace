import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

// GET /api/reports/cash-at-hand?from=&to=
// The headline "Cash at Hand" is the company's current running position:
//   (money in the system from topups + completed transactions, i.e. the
//   sum of every general ledger entry across all branches)
//   minus every expense and salary ever paid out.
// If from/to are given, they scope the expense/salary/commission
// breakdown shown alongside it — the headline itself is always the
// live, all-time balance.
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to + "T23:59:59") : undefined,
        }
      : undefined;

  const [ledgerTotal, topupTotal, commissionTotal, expenseTotal, salaryTotal] = await Promise.all([
    prisma.generalLedgerEntry.aggregate({ _sum: { amount: true } }),
    prisma.topup.aggregate({
      _sum: { amount: true },
      where: dateFilter ? { createdAt: dateFilter } : undefined,
    }),
    prisma.transaction.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "COMPLETED", ...(dateFilter ? { completedAt: dateFilter } : {}) },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.salaryPayment.aggregate({ _sum: { amount: true } }),
  ]);

  const ledgerPosition = Number(ledgerTotal._sum.amount ?? 0);
  const totalExpenses = Number(expenseTotal._sum.amount ?? 0);
  const totalSalaries = Number(salaryTotal._sum.amount ?? 0);
  const netCashAtHand = ledgerPosition - totalExpenses - totalSalaries;

  return NextResponse.json({
    netCashAtHand,
    ledgerPosition,
    totalTopups: Number(topupTotal._sum.amount ?? 0),
    totalCommissionEarned: Number(commissionTotal._sum.commissionAmount ?? 0),
    totalExpenses,
    totalSalaries,
    period: { from, to },
  });
}