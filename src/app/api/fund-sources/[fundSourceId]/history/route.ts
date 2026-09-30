import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { resolveActorNames } from "@/lib/audit-actor";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fundSourceId: string }> }
) {
  const guard = await requirePermission(req, "VIEW_PARTNERS");
  if (guard instanceof NextResponse) return guard;
  const { fundSourceId } = await params;

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "FundSource", entityId: fundSourceId, action: "FUND_SOURCE_EDITED" },
    orderBy: { createdAt: "desc" },
  });
  const names = await resolveActorNames(prisma, logs);

  return NextResponse.json({
    history: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      editedBy: names.get(l.performedByUserId ?? l.performedByAdminId ?? "") ?? "Unknown",
      ...(l.metadata as { before: any; after: any }),
    })),
  });
}