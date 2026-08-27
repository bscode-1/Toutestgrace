import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";


const refundSchema = z.object({
  pickupCode: z.string().length(16),
  senderName: z.string().min(2).optional(),
});

// POST /api/transactions/refund — sender branch reverses a pending send (staff only)
export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { hasPermission } = await import("@/lib/permissions");
if (!(await hasPermission(auth.role, "PROCESS_REFUND"))) {
  return NextResponse.json({ error: "You don't have permission to process refunds" }, { status: 403 });
}

  const body = await req.json();
  const parsed = refundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { pickupCode, senderName } = parsed.data;
  const staffBranchId = auth.branchId as string;

  const transaction = await prisma.transaction.findUnique({ where: { pickupCode } });

  if (!transaction) {
    return NextResponse.json({ error: "No transaction found for this pickup code" }, { status: 404 });
  }

  if (transaction.senderBranchId !== staffBranchId) {
    return NextResponse.json(
      { error: "This transaction can only be refunded at the sending branch" },
      { status: 403 }
    );
  }

  if (transaction.status !== "PENDING") {
    return NextResponse.json(
      { error: `Transaction is already ${transaction.status}, cannot refund` },
      { status: 400 }
    );
  }

  if (senderName && senderName.trim().toLowerCase() !== transaction.senderName.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Sender name does not match the name on record for this transaction" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "REFUNDED",
        refundedById: auth.id,
        refundedAt: new Date(),
      },
    });

    await tx.subLedgerEntry.create({
      data: {
        branchId: staffBranchId,
        transactionId: transaction.id,
        entryType: "REFUNDED_OUT",
        amount: transaction.amountSent,
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId: transaction.senderBranchId,
        transactionId: transaction.id,
        sourceType: "TRANSACTION",
        amount: -Number(transaction.amountSent),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        action: "REFUNDED",
        performedByUserId: auth.id,
        metadata: { pickupCode, amountRefunded: Number(transaction.amountSent) },
      },
    });

    return updated;
  });

  return NextResponse.json({ transaction: result });
}