// TOP OF FILE
import { getBranchCashPosition } from "@/lib/branch-cash";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/prisma";
import { calculateBranchCapital } from "@/lib/branch-capital";


const bodySchema = z.object({
  partnerId: z.string().min(1), // cuid, not uuid — Partner.id bug
  amount: z.number().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "MANAGE_BRANCH_CAPITAL");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { partnerId, amount } = parsed.data;

  const { outstanding } = await calculateBranchCapital(branchId);
  if (amount > outstanding) {
    return NextResponse.json(
      { error: `Amount exceeds outstanding capital (${outstanding})` },
      { status: 400 }
    );
  }

    // BEFORE prisma.branchCapitalReturn.create(...)
  const cash = await getBranchCashPosition(branchId);
  if (amount > cash.cashPosition) {
    return NextResponse.json(
      { error: `Branch only holds ${cash.cashPosition.toFixed(2)} in cash` },
      { status: 400 }
    );
  }

  const created = await prisma.branchCapitalReturn.create({
    data: {
      branchId,
      partnerId,
      amount,
      recordedById: auth.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "BranchCapitalReturn",
      entityId: created.id,
      action: "BRANCH_CAPITAL_RETURNED",
      ...(auth.role === "SUPER_ADMIN"
        ? { performedByAdminId: auth.id }
        : { performedByUserId: auth.id }),
      metadata: { branchId, partnerId, amount },
    },
  });

  return NextResponse.json(created, { status: 201 });
}