// src/app/api/branch/me/tellers/route.ts — manager's list of tellers + balances
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getTellerBalance } from "@/lib/teller-ledger";

export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "BRANCH_MANAGER" && auth.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tellers = await prisma.appUser.findMany({
    where: { branchId: auth.branchId, role: "TELLER" },
    select: { id: true, name: true, isActive: true },
  });

  const withBalances = await Promise.all(
    tellers.map(async (t) => ({ ...t, balance: await getTellerBalance(t.id) }))
  );

  return NextResponse.json(withBalances);
}