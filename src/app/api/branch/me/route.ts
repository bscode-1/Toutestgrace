import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

// GET /api/branch/me — the logged-in staff member's own branch info + balance
export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const branchId = auth.branchId as string;

  const [branch, ledgerResult] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        manager: { select: { name: true } },
        currency: { select: { code: true, symbol: true } },
      },
    }),
    prisma.generalLedgerEntry.aggregate({
      where: { branchId },
      _sum: { amount: true },
    }),
  ]);

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({
    branch,
    balance: ledgerResult._sum.amount ?? 0,
  });
}
