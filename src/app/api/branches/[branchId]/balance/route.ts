import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

// GET /api/branches/:branchId/balance — running ledger balance (super admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "VIEW_ROLES");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const result = await prisma.generalLedgerEntry.aggregate({
    where: { branchId },
    _sum: { amount: true },
  });

  return NextResponse.json({ balance: result._sum.amount ?? 0 });
}