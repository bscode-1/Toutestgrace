// src/app/api/partner-distributions/[distributionId]/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET(req: NextRequest, { params }: { params: Promise<{ distributionId: string }> }) {
  const auth = await requirePermission(req, "VIEW_PARTNERS");
  if (auth instanceof NextResponse) return auth;
  const { distributionId } = await params;

  const history = await prisma.auditLog.findMany({
    where: { entityType: "PartnerDistribution", entityId: distributionId, action: "PARTNER_DISTRIBUTION_EDITED" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(history);
}