import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

// GET /api/reports/cash-at-hand?from=<ISO>&to=<ISO>
// Headline netCashAtHand is always the live, all-time position.
// from/to scope topups, commission, expenses and salaries shown alongside it.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_REPORTS");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const f = sp.get("from");
  const t = sp.get("to");
  const from = f ? new Date(f) : undefined;
  const to = t ? new Date(t) : undefined;

  if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const range = from || to ? { gte: from, lte: to } : undefined;

  const [
    ledgerTotal,
    expenseAll,
    salaryAll,
    topupTotal,
    commissionTotal,
    expensePeriod,
    salaryPeriod,
  ] = await Promise.all([
    prisma.generalLedgerEntry.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.salaryPayment.aggregate({ _sum: { amount: true } }),
    prisma.topup.aggregate({
      _sum: { amount: true },
      where: range ? { createdAt: range } : undefined,
    }),
    prisma.transaction.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "COMPLETED", ...(range ? { completedAt: range } : {}) },
    }),
    range
      ? prisma.expense.aggregate({ _sum: { amount: true }, where: { createdAt: range } })
      : Promise.resolve(null),
    range
      ? prisma.salaryPayment.aggregate({ _sum: { amount: true }, where: { paidAt: range } })
      : Promise.resolve(null),
  ]);

  const ledgerPosition = Number(ledgerTotal._sum.amount ?? 0);
  const netCashAtHand =
    ledgerPosition -
    Number(expenseAll._sum.amount ?? 0) -
    Number(salaryAll._sum.amount ?? 0);

  return NextResponse.json({
    netCashAtHand,
    ledgerPosition,
    totalTopups: Number(topupTotal._sum.amount ?? 0),
    totalCommissionEarned: Number(commissionTotal._sum.commissionAmount ?? 0),
    totalExpenses: Number((expensePeriod ?? expenseAll)._sum.amount ?? 0),
    totalSalaries: Number((salaryPeriod ?? salaryAll)._sum.amount ?? 0),
    period: { from: f, to: t },
  });
}