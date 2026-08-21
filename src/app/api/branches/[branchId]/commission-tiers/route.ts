import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const createTierSchema = z
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

// POST /api/branches/:branchId/commission-tiers (super admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;
  const body = await req.json();
  const parsed = createTierSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { minAmount, maxAmount, commissionType, commissionPercent, commissionFlatAmount } =
    parsed.data;

  if (maxAmount <= minAmount) {
    return NextResponse.json({ error: "maxAmount must be greater than minAmount" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const tier = await prisma.commissionTier.create({
    data: {
      branchId,
      minAmount,
      maxAmount,
      commissionType,
      commissionPercent: commissionType === "PERCENTAGE" ? commissionPercent : null,
      commissionFlatAmount: commissionType === "FLAT" ? commissionFlatAmount : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "COMMISSION_TIER",
      entityId: tier.id,
      action: "CREATED",
      performedByAdminId: auth.id,
      metadata: { branchId, minAmount, maxAmount, commissionType, commissionPercent, commissionFlatAmount },
    },
  });

  return NextResponse.json({ tier }, { status: 201 });
}

// GET /api/branches/:branchId/commission-tiers (super admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const tiers = await prisma.commissionTier.findMany({
    where: { branchId, activeTo: null },
    orderBy: { minAmount: "asc" },
  });

  return NextResponse.json({ tiers });
}