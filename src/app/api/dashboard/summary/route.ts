import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/dashboard/summary?from=&to=&branchId=
 *
 * - Super admin: sees ALL branches by default, or a specific branch via ?branchId=
 * - Branch staff: always scoped to their own branch, ?branchId= is ignored for them
 *
 * Returns counts + sums for: sent, received, pending, completed, refunded
 */
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

  const from = fromParam ? new Date(fromParam) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = toParam ? new Date(toParam) : new Date();

  let branchId: string | undefined;
  if (isStaff) {
    branchId = payload.branchId;
  } else if (branchIdParam) {
    branchId = branchIdParam;
  }

  const dateFilter = { createdAt: { gte: from, lte: to } };
  const branchFilter = branchId ? { senderBranchId: branchId } : {};
  const branchFilterReceiver = branchId ? { receiverBranchId: branchId } : {};

  const [sent, received, pending, completed, refunded] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...dateFilter, ...branchFilter },
      _count: true,
      _sum: { amountSent: true },
    }),
    prisma.transaction.aggregate({
      where: { ...dateFilter, ...branchFilterReceiver },
      _count: true,
      _sum: { amountPayable: true },
    }),
    prisma.transaction.aggregate({
      where: { ...dateFilter, ...branchFilter, status: "PENDING" },
      _count: true,
      _sum: { amountSent: true },
    }),
    prisma.transaction.aggregate({
      where: { ...dateFilter, ...branchFilter, status: "COMPLETED" },
      _count: true,
      _sum: { amountSent: true },
    }),
    prisma.transaction.aggregate({
      where: { ...dateFilter, ...branchFilter, status: "REFUNDED" },
      _count: true,
      _sum: { amountSent: true },
    }),
  ]);

  return NextResponse.json({
    period: { from, to },
    branchId: branchId ?? "ALL",
    totalSent: { count: sent._count, amount: sent._sum.amountSent ?? 0 },
    totalReceived: { count: received._count, amount: received._sum.amountPayable ?? 0 },
    pending: { count: pending._count, amount: pending._sum.amountSent ?? 0 },
    completed: { count: completed._count, amount: completed._sum.amountSent ?? 0 },
    refunded: { count: refunded._count, amount: refunded._sum.amountSent ?? 0 },
  });
}