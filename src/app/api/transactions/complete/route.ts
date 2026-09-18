import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";

const completeSchema = z.object({
  pickupCode: z.string().length(16),
  receiverName: z.string().min(2).optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  if (!(await hasPermission(auth.role, "COMPLETE_PICKUP"))) {
    return NextResponse.json({ error: "You don't have permission to complete pickups" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { pickupCode, receiverName } = parsed.data;

  const transaction = await prisma.transaction.findFirst({
    where: { pickupCode, status: { in: ["PENDING", "PARTIAL"] } },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: "No pending or partial transaction found for this pickup code" },
      { status: 404 }
    );
  }

  if (transaction.receiverBranchId !== auth.branchId) {
    return NextResponse.json(
      { error: "This pickup code is not assigned to your branch" },
      { status: 403 }
    );
  }

  if (receiverName) {
    const nameMatch = transaction.receiverName.toLowerCase().includes(receiverName.toLowerCase());
    if (!nameMatch) {
      return NextResponse.json({ error: "Receiver name does not match our records" }, { status: 400 });
    }
  }

  const remaining = Number(transaction.amountPayable) - Number(transaction.amountCollected);
  if (remaining <= 0) {
    return NextResponse.json({ error: "Nothing left to collect on this transaction" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        amountCollected: Number(transaction.amountPayable),
        status: "COMPLETED",
        completedById: auth.id,
        completedAt: new Date(),
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId: transaction.receiverBranchId,
        amount: -remaining,
        transactionId: transaction.id,
        sourceType: "TRANSACTION",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        action: "COMPLETED",
        performedByUserId: auth.id,
        metadata: { collected: remaining },
      },
    });

    return updated;
  });

  return NextResponse.json({ transaction: result });
}