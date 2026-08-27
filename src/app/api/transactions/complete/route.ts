import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";

const completeSchema = z.object({
  pickupCode: z.string().length(16),
  receiverName: z.string().min(2).optional(),
});

// POST /api/transactions/complete — receiver branch pays out (staff only)
export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { hasPermission } = await import("@/lib/permissions");
if (!(await hasPermission(auth.role, "COMPLETE_PICKUP"))) {
  return NextResponse.json({ error: "You don't have permission to complete pickups" }, { status: 403 });
}

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { pickupCode, receiverName } = parsed.data;
  const staffBranchId = auth.branchId as string;

  const transaction = await prisma.transaction.findUnique({ where: { pickupCode } });

  if (!transaction) {
    return NextResponse.json({ error: "No transaction found for this pickup code" }, { status: 404 });
  }

  if (transaction.receiverBranchId !== staffBranchId) {
    return NextResponse.json(
      { error: "This transaction is not payable at your branch" },
      { status: 403 }
    );
  }

  if (transaction.status !== "PENDING") {
    return NextResponse.json(
      { error: `Transaction is already ${transaction.status}, cannot complete` },
      { status: 400 }
    );
  }

  if (receiverName && receiverName.trim().toLowerCase() !== transaction.receiverName.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Receiver name does not match the name on record for this transaction" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "COMPLETED",
        completedById: auth.id,
        completedAt: new Date(),
      },
    });

    await tx.subLedgerEntry.create({
      data: {
        branchId: staffBranchId,
        transactionId: transaction.id,
        entryType: "COMPLETED_OUT",
        amount: transaction.amountPayable,
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId: transaction.senderBranchId,
        transactionId: transaction.id,
        sourceType: "TRANSACTION",
        amount: transaction.amountSent,
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId: transaction.receiverBranchId,
        transactionId: transaction.id,
        sourceType: "TRANSACTION",
        amount: -Number(transaction.amountPayable),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        action: "COMPLETED",
        performedByUserId: auth.id,
        metadata: { pickupCode, receiverBranchId: staffBranchId },
      },
    });

    return updated;
  });

  return NextResponse.json({ transaction: result });
}

