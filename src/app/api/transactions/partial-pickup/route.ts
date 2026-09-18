import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";

const withdrawSchema = z.object({
  amount: z.number().positive(),
  pickupCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  if (!(await hasPermission(auth.role, "COMPLETE_PICKUP"))) {
    return NextResponse.json({ error: "You don't have permission to complete pickups" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { amount: withdrawAmount, pickupCode: code } = parsed.data;

  const transaction = await prisma.transaction.findFirst({
    where: { pickupCode: code, status: { in: ["PENDING", "PARTIAL"] } },
  });

  // ...rest of the handler is unchanged

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

  const collected = Number(transaction.amountCollected);
  const total = Number(transaction.amountPayable);
  const remaining = total - collected;

  if (withdrawAmount > remaining) {
    return NextResponse.json(
      { error: `Amount exceeds remaining balance. Remaining: $${remaining.toFixed(2)}` },
      { status: 400 }
    );
  }

  const newCollected = collected + withdrawAmount;
  const isFullyCollected = newCollected === total;
  const newStatus = isFullyCollected ? "COMPLETED" : "PARTIAL";
  const receiptNumber = `PKP-${Date.now()}`;

  const [pickupEvent, updatedTransaction] = await prisma.$transaction(async (tx) => {
    const event = await tx.pickupEvent.create({
      data: {
        transactionId: transaction.id,
        amount: withdrawAmount,
        collectedById: auth.id,
        receiptNumber,
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId: transaction.receiverBranchId,
        amount: -withdrawAmount,
        transactionId: transaction.id,
        sourceType: "TRANSACTION",
      },
    });

    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        amountCollected: newCollected,
        status: newStatus,
        ...(isFullyCollected
          ? { completedById: auth.id, completedAt: new Date() }
          : {}),
      },
    });

    return [event, updated];
  });

  await prisma.auditLog.create({
    data: {
      entityType: "TRANSACTION",
      entityId: transaction.id,
      action: "PARTIAL_PICKUP",
      performedByUserId: auth.id,
      metadata: {
        withdrawAmount,
        newCollected,
        newStatus,
        pickupEventId: pickupEvent.id,
      },
    },
  });

  return NextResponse.json({
    pickupEvent,
    transaction: {
      ...updatedTransaction,
      remaining: total - newCollected,
    },
  });
}