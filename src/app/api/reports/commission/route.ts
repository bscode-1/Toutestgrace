import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/reports/commission?from=&to=&branchId=
// Commission is only counted from COMPLETED transactions — a refund returns
// the full amount including commission, so nothing was actually earned there.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const isSuperAdmin = payload.role === "SUPER_ADMIN";
  const isStaff = payload.role === "TELLER" || payload.role === "BRANCH_MANAGER";
  if (!isSuperAdmin && !isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const branchIdParam = searchParams.get("branchId");

  const from = fromParam ? new Date(fromParam) : new Date(new Date().setDate(new Date().getDate() - 30));
  const to = toParam ? new Date(toParam + "T23:59:59") : new Date();

  const scopedBranchId = isStaff ? payload.branchId : branchIdParam || undefined;

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