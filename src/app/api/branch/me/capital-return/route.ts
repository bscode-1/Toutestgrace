import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getBranchCashPosition } from "@/lib/branch-cash";
import { calculateBranchCapital } from "@/lib/branch-capital";

const schema = z.object({
  partnerId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const auth = requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "BRANCH_MANAGER" || !auth.branchId)
    return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { partnerId, amount } = parsed.data;

  const funded = await prisma.partnerDistribution.findFirst({
    where: { branchId: auth.branchId, partnerId },
    select: { id: true },
  });
  if (!funded)
    return NextResponse.json({ error: "This partner has not funded your branch" }, { status: 400 });

  const c: any = await calculateBranchCapital(auth.branchId);
  const toTransfer = Number(c?.outstanding) || 0;
  if (amount > toTransfer + 0.005)
    return NextResponse.json(
      {
        error: `Only $${Math.max(0, toTransfer).toFixed(2)} of capital is left to transfer. The rest is your commission.`,
      },
      { status: 400 }
    );

  const pos: any = await getBranchCashPosition(auth.branchId);
  const cash = Number(
    typeof pos === "object" && pos !== null ? pos.cashPosition ?? pos.cash ?? 0 : pos
  ) || 0;
  if (amount > cash + 0.005)
    return NextResponse.json(
      { error: `Only $${cash.toFixed(2)} cash in hand. Collect more from tellers first.` },
      { status: 400 }
    );

  const ret = await prisma.$transaction(async (tx) => {
    const r = await tx.branchCapitalReturn.create({
      data: { branchId: auth.branchId!, partnerId, amount, recordedById: auth.id },
    });
    await tx.auditLog.create({
      data: {
        entityType: "BranchCapitalReturn",
        entityId: r.id,
        action: "CAPITAL_RETURNED",
        performedByUserId: auth.id,
        metadata: { branchId: auth.branchId, partnerId, amount },
      },
    });
    return r;
  });

  return NextResponse.json({ ok: true, id: ret.id });
}