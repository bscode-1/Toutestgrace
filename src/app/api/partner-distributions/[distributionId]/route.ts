import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { auditActor } from "@/lib/audit-actor";

const schema = z.object({
  partnerId: z.string().min(1).optional(),          // cuid
  branchId: z.string().uuid().optional(),
  fundSourceId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  notes: z.string().nullable().optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ distributionId: string }> }
) {
  const guard = await requirePermission(req, "MANAGE_PARTNERS");
  if (guard instanceof NextResponse) return guard;
  const { distributionId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.partnerDistribution.findUnique({ where: { id: distributionId } });
  if (!existing) return NextResponse.json({ error: "Cash-out record not found" }, { status: 404 });

  const newPartnerId = input.partnerId ?? existing.partnerId;
  const newFundSourceId = input.fundSourceId ?? existing.fundSourceId;
  const newAmount = input.amount ?? Number(existing.amount);

  // The (possibly new) fund source must belong to the (possibly new) partner
  const fundSource = await prisma.fundSource.findUnique({ where: { id: newFundSourceId } });
  if (!fundSource) return NextResponse.json({ error: "Cash-in source not found" }, { status: 404 });
  if (fundSource.partnerId !== newPartnerId) {
    return NextResponse.json(
      { error: "That cash-in source doesn't belong to the selected partner." },
      { status: 400 }
    );
  }

  if (input.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Total distributed from this fund source (excluding this record) + new amount must fit
  const others = await prisma.partnerDistribution.findMany({
    where: { fundSourceId: newFundSourceId, id: { not: distributionId } },
  });
  const otherTotal = others.reduce((s, d) => s + Number(d.amount), 0);
  if (otherTotal + newAmount > Number(fundSource.cashValue)) {
    const room = Number(fundSource.cashValue) - otherTotal;
    return NextResponse.json(
      { error: `Amount exceeds what's left on cash-in ${fundSource.code} (${room.toFixed(2)} available).` },
      { status: 400 }
    );
  }

  const data: Record<string, any> = {};
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};

  const candidates: Record<string, any> = {
    partnerId: input.partnerId,
    branchId: input.branchId,
    fundSourceId: input.fundSourceId,
    amount: input.amount,
    notes: input.notes,
    recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
  };
  for (const [k, v] of Object.entries(candidates)) {
    if (v === undefined) continue;
    const old = (existing as any)[k];
    const same =
      v instanceof Date ? +v === +new Date(old) :
      k === "amount" ? Number(old) === Number(v) : old === v;
    if (same) continue;
    data[k] = v;
    before[k] = k === "amount" ? Number(old) : old;
    after[k] = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ distribution: existing, unchanged: true });
  }

  const [updated] = await prisma.$transaction([
    prisma.partnerDistribution.update({ where: { id: distributionId }, data }),
    prisma.auditLog.create({
      data: {
        entityType: "PartnerDistribution",
        entityId: distributionId,
        action: "PARTNER_DISTRIBUTION_EDITED",
        metadata: { before, after },
        ...auditActor(guard),
      },
    }),
  ]);

  return NextResponse.json({ distribution: updated });
}