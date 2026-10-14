import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getBranchCashPosition } from "@/lib/branch-cash";
import { calculateBranchCapital } from "@/lib/branch-capital";
import { requireBranchManager } from "@/lib/require-branch-manager";

const num = (v: any) => Number(v) || 0;
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return num(o[k]);
  return 0;
};

export async function GET(req: NextRequest) {
  // first lines of the handler:
  const guard = requireBranchManager(req);
  if ("error" in guard) return guard.error;
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "BRANCH_MANAGER" || !auth.branchId)
    return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const pos: any = await getBranchCashPosition(auth.branchId);
  const cashPosition = num(
    typeof pos === "object" && pos !== null ? pos.cashPosition ?? pos.cash ?? 0 : pos
  );

  const c: any = await calculateBranchCapital(auth.branchId);
  const deposits = pick(c, "totalDeposits", "deposits");
  const refunds = pick(c, "totalRefunds", "refunds");
  const withdrawals = pick(c, "totalWithdrawals", "withdrawals");
  const commission = pick(c, "totalCommission", "commission");
  const returned = pick(c, "alreadyReturned", "totalReturned", "returned");
  const toTransfer = pick(c, "outstanding");

    const partners = await prisma.partner.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  
  return NextResponse.json({
    cashPosition,
    capital: {
      deposits,
      refunds,
      withdrawals,
      commission,
      returned,
      toTransfer,
      capitalAtHand: toTransfer + commission,
    },
    partners,
  });
}