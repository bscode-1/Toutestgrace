import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getBranchCashPosition } from "@/lib/branch-cash";
import { calculateBranchCapital } from "@/lib/branch-capital";

const num = (v: any) => Number(v) || 0;
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return num(o[k]);
  return 0;
};

export async function GET(req: NextRequest) {
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

  const dists = await prisma.partnerDistribution.findMany({
    where: { branchId: auth.branchId },
    distinct: ["partnerId"],
    select: { partner: { select: { id: true, name: true } } },
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
    partners: dists.map((d) => d.partner),
  });
}