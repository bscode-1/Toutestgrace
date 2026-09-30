import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
  const auth: any = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const isManager = auth.role === "BRANCH_MANAGER";
  const isTeller = auth.role === "TELLER";
  if ((!isManager && !isTeller) || !auth.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {
    senderBranchId: auth.branchId,
    status: { not: "REFUNDED" },
    commissionAmount: { gt: 0 },
    ...(isTeller ? { createdById: auth.id } : {}),
  };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      createdAt: true,
      amountSent: true,
      commissionAmount: true,
      commissionMode: true,
      totalCharged: true,
      status: true,
    },
  });

  const transactions = rows.map((t) => ({
    id: t.id,
    createdAt: t.createdAt,
    amountSent: Number(t.amountSent),
    commission: Number(t.commissionAmount),
    commissionMode: t.commissionMode,
    totalCharged: Number(t.totalCharged),
    status: t.status,
  }));

  const total = transactions.reduce((s, t) => s + t.commission, 0);

  return NextResponse.json({ total, count: transactions.length, transactions });
}