import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { auditActor } from "@/lib/audit-actor";

const schema = z.object({
  partnerId: z.string().min(1).optional(),          // cuid, NOT .uuid()
  commodityName: z.string().min(1).optional(),
  cashValue: z.number().positive().optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fundSourceId: string }> }
) {
  const guard = await requirePermission(req, "MANAGE_PARTNERS");
  if (guard instanceof NextResponse) return guard;
  const { fundSourceId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.fundSource.findUnique({ where: { id: fundSourceId } });
  if (!existing) return NextResponse.json({ error: "Cash-in record not found" }, { status: 404 });

  // Distributions already made against this cash-in
  const dists = await prisma.partnerDistribution.findMany({ where: { fundSourceId } });

  // Can't move it to another partner if distributions from a different partner exist
  if (input.partnerId && input.partnerId !== existing.partnerId) {
    if (dists.some((d) => d.partnerId !== input.partnerId)) {
      return NextResponse.json(
        { error: "Distributions already exist against this cash-in for the current partner. Edit or remove them first." },
        { status: 400 }
      );
    }
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  // Can't shrink the cash value below what's already been distributed from it
  if (input.cashValue !== undefined) {
    const distributed = dists.reduce((s, d) => s + Number(d.amount), 0);
    if (input.cashValue < distributed) {
      return NextResponse.json(
        { error: `Cash value can't be below ${distributed.toFixed(2)} already distributed from it.` },
        { status: 400 }
      );
    }
  }

  // Build before/after for changed fields only
  const data: Record<string, any> = {};
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};

  const candidates: Record<string, any> = {
    partnerId: input.partnerId,
    commodityName: input.commodityName,
    cashValue: input.cashValue,
    recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
  };
  for (const [k, v] of Object.entries(candidates)) {
    if (v === undefined) continue;
    const old = (existing as any)[k];
    const same =
      v instanceof Date ? +v === +new Date(old) :
      k === "cashValue" ? Number(old) === Number(v) : old === v;
    if (same) continue;
    data[k] = v;
    before[k] = k === "cashValue" ? Number(old) : old;
    after[k] = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ fundSource: existing, unchanged: true });
  }

  const [updated] = await prisma.$transaction([
    prisma.fundSource.update({ where: { id: fundSourceId }, data }),
    prisma.auditLog.create({
      data: {
        entityType: "FundSource",
        entityId: fundSourceId,
        action: "FUND_SOURCE_EDITED",
        metadata: { before, after },
        ...auditActor(guard),
      },
    }),
  ]);

  return NextResponse.json({ fundSource: updated });
}