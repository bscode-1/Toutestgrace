import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const updateTierSchema = z
  .object({
    minAmount: z.number().nonnegative(),
    maxAmount: z.number().positive(),
    commissionType: z.enum(["PERCENTAGE", "FLAT"]),
    commissionPercent: z.number().min(0).max(100).optional(),
    commissionFlatAmount: z.number().min(0).optional(),
  })
  .refine(
    (data) =>
      (data.commissionType === "PERCENTAGE" && data.commissionPercent !== undefined) ||
      (data.commissionType === "FLAT" && data.commissionFlatAmount !== undefined),
    { message: "commissionPercent is required for PERCENTAGE type, commissionFlatAmount for FLAT type" }
  );

// PATCH /api/branches/:branchId/commission-tiers/:tierId — versioned edit:
// closes the old tier (activeTo = now) and creates a brand new one with the
// updated numbers, so historical transactions still point at the tier that
// was actually in effect when they were created.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; tierId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId, tierId } = await params;
  const body = await req.json();
  const parsed = updateTierSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.commissionTier.findUnique({ where: { id: tierId } });
  if (!existing || existing.branchId !== branchId) {
    return NextResponse.json({ error: "Commission tier not found for this branch" }, { status: 404 });
  }
  if (existing.activeTo !== null) {
    return NextResponse.json({ error: "This tier has already been retired" }, { status: 400 });
  }

  const { minAmount, maxAmount, commissionType, commissionPercent, commissionFlatAmount } = parsed.data;

  if (maxAmount <= minAmount) {
    return NextResponse.json({ error: "maxAmount must be greater than minAmount" }, { status: 400 });
  }

  const now = new Date();

  const [, newTier] = await prisma.$transaction([
    prisma.commissionTier.update({
      where: { id: tierId },
      data: { activeTo: now },
    }),
    prisma.commissionTier.create({
      data: {
        branchId,
        minAmount,
        maxAmount,
        commissionType,
        commissionPercent: commissionType === "PERCENTAGE" ? commissionPercent : null,
        commissionFlatAmount: commissionType === "FLAT" ? commissionFlatAmount : null,
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      entityType: "COMMISSION_TIER",
      entityId: newTier.id,
      action: "REVISED",
      performedByAdminId: auth.id,
      metadata: { replacedTierId: tierId, minAmount, maxAmount, commissionType, commissionPercent, commissionFlatAmount },
    },
  });

  return NextResponse.json({ tier: newTier });
}

// DELETE /api/branches/:branchId/commission-tiers/:tierId — retire a tier
// (never a hard delete — past transactions still reference it by ID)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; tierId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId, tierId } = await params;

  const existing = await prisma.commissionTier.findUnique({ where: { id: tierId } });
  if (!existing || existing.branchId !== branchId) {
    return NextResponse.json({ error: "Commission tier not found for this branch" }, { status: 404 });
  }
  if (existing.activeTo !== null) {
    return NextResponse.json({ error: "This tier is already retired" }, { status: 400 });
  }

  const tier = await prisma.commissionTier.update({
    where: { id: tierId },
    data: { activeTo: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "COMMISSION_TIER",
      entityId: tierId,
      action: "RETIRED",
      performedByAdminId: auth.id,
      metadata: {},
    },
  });

  return NextResponse.json({ tier });
}