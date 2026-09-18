import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

// GET /api/reports/commission?from=&to=&branchId=
// Commission is only counted from COMPLETED transactions — a refund returns
// the full amount including commission, so nothing was actually earned there.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_COMMISSION_REPORT");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const branchIdParam = searchParams.get("branchId");

  const from = fromParam ? new Date(fromParam) : new Date(new Date().setDate(new Date().getDate() - 30));
  const to = toParam ? new Date(toParam + "T23:59:59") : new Date();

  // Super admin (or any role broad enough to hold VIEW_COMMISSION_REPORT without
  // a branch tie) can filter by branchId or see everything; staff with their
  // own branch are always scoped to it, regardless of branchId in the query.
  const scopedBranchId = auth.role === "SUPER_ADMIN" ? branchIdParam || undefined : auth.branchId;

  const where = {
    status: "COMPLETED" as const,
    completedAt: { gte: from, lte: to },
    ...(scopedBranchId ? { senderBranchId: scopedBranchId } : {}),
  };

  const [totals, byBranch] = await Promise.all([
    prisma.transaction.aggregate({
      where,
      _sum: { commissionAmount: true, amountSent: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ["senderBranchId"],
      where,
      _sum: { commissionAmount: true, amountSent: true },
      _count: true,
      orderBy: { _sum: { commissionAmount: "desc" } },
    }),
  ]);

  const branchIds = byBranch.map((b) => b.senderBranchId);
  const branches = await prisma.branch.findMany({
    where: { id: { in: branchIds } },
    select: { id: true, name: true },
  });
  const branchNameMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  return NextResponse.json({
    period: { from, to },
    totalCommission: totals._sum.commissionAmount ?? 0,
    totalVolume: totals._sum.amountSent ?? 0,
    transactionCount: totals._count,
    byBranch: byBranch.map((b) => ({
      branchId: b.senderBranchId,
      branchName: branchNameMap[b.senderBranchId] || "Unknown",
      commissionEarned: b._sum.commissionAmount ?? 0,
      volume: b._sum.amountSent ?? 0,
      transactionCount: b._count,
    })),
  });
}