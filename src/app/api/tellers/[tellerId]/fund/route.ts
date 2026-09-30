// src/app/api/tellers/[tellerId]/fund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { recordTellerLedgerEntry } from "@/lib/teller-ledger";
import { getBranchCashPosition } from "@/lib/branch-cash";

export async function POST(req: NextRequest, { params }: { params: Promise<{ tellerId: string }> }) {
  const auth = await requirePermission(req, "FUND_TELLER");

  if (auth instanceof NextResponse) return auth;
  const { tellerId } = await params;

  const teller = await prisma.appUser.findUnique({
  where: { id: tellerId },
  select: { id: true, role: true, branchId: true, isActive: true },
});
  const { amount } = z.object({ amount: z.number().positive() }).parse(await req.json());

  if (!teller || !teller.isActive) {
    return NextResponse.json({ error: "Teller not found" }, { status: 404 });
  }
  if (teller.branchId) {
  const cash = await getBranchCashPosition(teller.branchId);
  
  if (amount > cash.cashPosition) {
    return NextResponse.json(
      { error: `Branch only has ${cash.cashPosition.toFixed(2)} available to fund tellers` },
      { status: 400 }
    );
  }
}
  // TODO: verify tellerId's branch matches auth's branch, unless SUPER_ADMIN

  const entry = await recordTellerLedgerEntry({
    tellerId,
    type: "MANAGER_FUNDING",
    amount,
    givenById: auth.id,
  });

  return NextResponse.json(entry);
}