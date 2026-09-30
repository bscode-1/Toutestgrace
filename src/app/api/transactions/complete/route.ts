import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTellerCanPay } from "@/lib/teller-ledger";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { recordTellerLedgerEntry } from "@/lib/teller-ledger";

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

  // Teller must have enough cash to pay out
  try {
    await assertTellerCanPay(auth.id, remaining);
  } catch (e: any) {
    if (e.code === "INSUFFICIENT_TELLER_BALANCE") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
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

    // Full completion must also create a PickupEvent, otherwise branch-capital withdrawals miss it
    const event = await tx.pickupEvent.create({
      data: {
        transactionId: transaction.id,
        amount: remaining,
        collectedById: auth.id,
        receiptNumber: `PKP-${Date.now()}`,
      },
    });

    await recordTellerLedgerEntry(
      {
        tellerId: auth.id,
        type: "WITHDRAWAL_PAID",
        amount: remaining,
        refType: "PICKUP_EVENT",
        refId: event.id,
      },
      tx
    );

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