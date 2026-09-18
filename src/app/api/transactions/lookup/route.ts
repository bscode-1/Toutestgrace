import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Pickup code is required" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { pickupCode: code },
    include: {
      pickupEvents: { orderBy: { createdAt: "desc" } },
      receiverBranch: { select: { name: true } },
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (transaction.status === "COMPLETED" || transaction.status === "REFUNDED") {
    return NextResponse.json(
      { error: `Transaction already ${transaction.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  const collected = Number(transaction.amountCollected);
  const total = Number(transaction.amountPayable);
  const remaining = total - collected;

  return NextResponse.json({
    transaction: {
      id: transaction.id,
      pickupCode: transaction.pickupCode,
      status: transaction.status,
      senderName: transaction.senderName,
      receiverName: transaction.receiverName,
      amountPayable: total,
      amountCollected: collected,
      remaining,
      currencyId: transaction.currencyId,
      receiverBranchId: transaction.receiverBranchId,
      receiverBranchName: transaction.receiverBranch?.name,
      createdAt: transaction.createdAt,
    },
    pickupEvents: transaction.pickupEvents,
  });
}