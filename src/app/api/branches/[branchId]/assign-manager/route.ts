import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const assignManagerSchema = z.object({
  managerId: z.string().uuid(),
});

// POST /api/branches/:branchId/assign-manager (super admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;
  const body = await req.json();
  const parsed = assignManagerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { managerId } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const manager = await prisma.appUser.findUnique({ where: { id: managerId } });
  if (!manager) {
    return NextResponse.json({ error: "Manager user not found" }, { status: 404 });
  }
  if (manager.role !== "BRANCH_MANAGER") {
    return NextResponse.json({ error: "User is not a BRANCH_MANAGER" }, { status: 400 });
  }
  if (manager.branchId !== branchId) {
    return NextResponse.json(
      { error: "Manager must belong to the branch they're being assigned to" },
      { status: 400 }
    );
  }

  const updatedBranch = await prisma.branch.update({
    where: { id: branchId },
    data: { managerId, status: "ACTIVE" },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branchId,
      action: "MANAGER_ASSIGNED_AND_ACTIVATED",
      performedByAdminId: auth.id,
      metadata: { managerId },
    },
  });

  return NextResponse.json({ branch: updatedBranch });
}