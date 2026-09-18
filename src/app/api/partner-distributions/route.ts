import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createSchema = z.object({
  partnerId: z.string().uuid(),
  branchId: z.string().uuid(),
  fundSourceId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

// POST /api/partner-distributions — distribute cash from partner to branch
// auto-creates a Topup so the branch ledger stays in sync
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "RECORD_DISTRIBUTION");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { partnerId, branchId, fundSourceId, amount, note } = parsed.data;

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  if (!branch.managerId) {
    return NextResponse.json(
      { error: "Branch has no assigned manager — cannot process distribution" },
      { status: 400 }
    );
  }

  // Check partner has enough balance
  const [cashInTotal, cashOutTotal] = await Promise.all([
    prisma.fundSource.aggregate({ where: { partnerId }, _sum: { cashValue: true } }),
    prisma.partnerDistribution.aggregate({ where: { partnerId }, _sum: { amount: true } }),
  ]);

  const balance =
    Number(cashInTotal._sum.cashValue ?? 0) - Number(cashOutTotal._sum.amount ?? 0);

  if (amount > balance) {
    return NextResponse.json(
      { error: `Insufficient partner balance. Available: $${balance.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Generate receipt number for the topup
  const receiptNumber = `TUP-${Date.now()}`;

  // Use a transaction to create both records atomically
  const [topup, distribution] = await prisma.$transaction(async (tx) => {
    const newTopup = await tx.topup.create({
      data: {
        branchId,
        amount,
        currencyId: branch.currencyId,
        initiatedById: auth.id,
        branchManagerId: branch.managerId!,
        receiptNumber,
        acknowledgedAt: new Date(),
      },
    });

    await tx.generalLedgerEntry.create({
      data: {
        branchId,
        amount,
        topupId: newTopup.id,
        sourceType: "TOPUP",
      },
    });

    const newDistribution = await tx.partnerDistribution.create({
      data: {
        partnerId,
        branchId,
        fundSourceId,
        amount,
        note,
        topupId: newTopup.id,
        recordedById: auth.id,
      },
    });

    return [newTopup, newDistribution];
  });

  await prisma.auditLog.create({
    data: {
      entityType: "PARTNER_DISTRIBUTION",
      entityId: distribution.id,
      action: "CREATED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: { partnerId, branchId, amount, topupId: topup.id },
    },
  });

  return NextResponse.json({ distribution, topup }, { status: 201 });
}

// GET /api/partner-distributions?partnerId= — list distributions
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "VIEW_PARTNER_DISTRIBUTIONS");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get("partnerId");

  const distributions = await prisma.partnerDistribution.findMany({
    where: partnerId ? { partnerId } : undefined,
    orderBy: { distributedAt: "desc" },
    include: {
      partner: { select: { name: true } },
      branch: { select: { name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ distributions });
}