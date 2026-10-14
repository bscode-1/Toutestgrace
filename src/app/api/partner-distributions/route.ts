import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createSchema = z.object({
  partnerId: z.string().min(1),
  branchId: z.string().uuid(),
  fundSourceId: z.union([z.string().uuid(), z.literal("RETURNED")]).optional(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "RECORD_DISTRIBUTION");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { partnerId, branchId, fundSourceId, amount, note } = parsed.data;
  const fromReturned = fundSourceId === "RETURNED";

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

  // Overall partner balance = fund sources + returned capital − distributions
  const [cashInTotal, returnedTotal, cashOutTotal] = await Promise.all([
    prisma.fundSource.aggregate({ where: { partnerId }, _sum: { cashValue: true } }),
    prisma.branchCapitalReturn.aggregate({ where: { partnerId }, _sum: { amount: true } }),
    prisma.partnerDistribution.aggregate({ where: { partnerId }, _sum: { amount: true } }),
  ]);

  const returned = Number(returnedTotal._sum.amount ?? 0);
  const balance =
    Number(cashInTotal._sum.cashValue ?? 0) + returned - Number(cashOutTotal._sum.amount ?? 0);

  if (amount > balance + 0.005) {
    return NextResponse.json(
      { error: `Insufficient partner balance. Available: $${balance.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Per-source check
  if (fromReturned) {
    const used = await prisma.partnerDistribution.aggregate({
      where: { partnerId, fundSourceId: null },
      _sum: { amount: true },
    });
    const pool = returned - Number(used._sum.amount ?? 0);
    if (amount > pool + 0.005) {
      return NextResponse.json(
        { error: `Only $${Math.max(0, pool).toFixed(2)} of returned capital is available.` },
        { status: 400 }
      );
    }
  } else {
    const source = await prisma.fundSource.findUnique({ where: { id: fundSourceId } });
    if (!source || source.partnerId !== partnerId) {
      return NextResponse.json({ error: "Cash-in source not found for this partner" }, { status: 404 });
    }
    const used = await prisma.partnerDistribution.aggregate({
      where: { fundSourceId },
      _sum: { amount: true },
    });
    const left = Number(source.cashValue) - Number(used._sum.amount ?? 0);
    if (amount > left + 0.005) {
      return NextResponse.json(
        { error: `Only $${Math.max(0, left).toFixed(2)} left on cash-in ${source.code}.` },
        { status: 400 }
      );
    }
  }

  const receiptNumber = `TUP-${Date.now()}`;

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
        fundSourceId: fromReturned ? null : fundSourceId,
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
      metadata: { partnerId, branchId, amount, topupId: topup.id, fromReturned },
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
      recordedByUser: { select: { name: true } },
    },
  });

  return NextResponse.json({ distributions });
}