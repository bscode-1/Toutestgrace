import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import crypto from "crypto";

const createTopupSchema = z.object({
  branchId: z.string().uuid(),
  amount: z.number().positive(),
  currencyId: z.string().uuid().optional(),
  note: z.string().optional(),
});

function generateReceiptNumber(): string {
  return `RCPT-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
}

// POST /api/topups — super admin injects funds into a branch
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createTopupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { branchId, amount, currencyId, note } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  if (!branch.managerId) {
    return NextResponse.json(
      { error: "Branch has no manager assigned — cannot issue a topup receipt" },
      { status: 400 }
    );
  }

  const receiptNumber = generateReceiptNumber();

  const result = await prisma.$transaction(async (tx) => {
    const topup = await tx.topup.create({
      data: {
        branchId,
        amount,
        currencyId,
        initiatedById: auth.id,
        branchManagerId: branch.managerId as string,
        receiptNumber,
        status: "ISSUED",
        note,
      },
    });

    // Topups post to the general ledger immediately — not pending,
    // since the super admin's authorization is final the moment it's issued.
    await tx.generalLedgerEntry.create({
      data: {
        branchId,
        topupId: topup.id,
        sourceType: "TOPUP",
        amount,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "TOPUP",
        entityId: topup.id,
        action: "ISSUED",
        performedByAdminId: auth.id,
        metadata: { branchId, amount, receiptNumber },
      },
    });

    return topup;
  });

  return NextResponse.json({ topup: result }, { status: 201 });
}

// GET /api/topups — list all topups (super admin only)
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const topups = await prisma.topup.findMany({
    include: {
      branch: { select: { name: true } },
      branchManager: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ topups });
}