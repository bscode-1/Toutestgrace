import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

// GET /api/branches/:branchId/balance — running ledger balance (super admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const result = await prisma.generalLedgerEntry.aggregate({
    where: { branchId },
    _sum: { amount: true },
  });

  return NextResponse.json({ balance: result._sum.amount ?? 0 });
}