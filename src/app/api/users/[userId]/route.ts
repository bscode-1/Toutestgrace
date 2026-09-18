import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.string().min(2).optional(),
  branchId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/users/:userId — edit staff details or activate/deactivate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requirePermission(req, "MANAGE_STAFF");
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!existing) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (parsed.data.branchId) {
    const branchExists = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
    if (!branchExists) {
      return NextResponse.json({ error: "Target branch not found" }, { status: 404 });
    }
  }

  // If this person currently manages a branch, and we're changing their role away
  // from BRANCH_MANAGER or moving them to a different branch, that branch loses
  // its manager — auto-unassign it (and it falls back to INACTIVE, same rule as
  // branch creation) rather than leaving a dangling/inconsistent assignment.
  const managedBranch = await prisma.branch.findFirst({ where: { managerId: userId } });
  const losingManagerRole = parsed.data.role && parsed.data.role !== "BRANCH_MANAGER";
  const movingBranch = parsed.data.branchId && parsed.data.branchId !== existing.branchId;

  if (managedBranch && (losingManagerRole || movingBranch)) {
    await prisma.branch.update({
      where: { id: managedBranch.id },
      data: { managerId: null, status: "INACTIVE" },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "BRANCH",
        entityId: managedBranch.id,
        action: "MANAGER_UNASSIGNED_DEACTIVATED",
        performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
        performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
        metadata: { reason: "manager reassigned or role changed", userId },
      },
    });
  }

  const user = await prisma.appUser.update({
    where: { id: userId },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      entityType: "APP_USER",
      entityId: userId,
      action: "UPDATED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: parsed.data,
    },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

// DELETE /api/users/:userId — only allowed if they have zero transaction history
// and are not currently assigned as a branch manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requirePermission(req, "MANAGE_STAFF");
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  const [createdCount, completedCount, refundedCount, managedBranch] = await Promise.all([
    prisma.transaction.count({ where: { createdById: userId } }),
    prisma.transaction.count({ where: { completedById: userId } }),
    prisma.transaction.count({ where: { refundedById: userId } }),
    prisma.branch.findFirst({ where: { managerId: userId } }),
  ]);

  const totalTxActivity = createdCount + completedCount + refundedCount;

  if (totalTxActivity > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: this staff member has ${totalTxActivity} transaction(s) on record. Deactivate the account instead.`,
      },
      { status: 400 }
    );
  }

  if (managedBranch) {
    return NextResponse.json(
      {
        error: `Cannot delete: this person is currently the manager of ${managedBranch.name}. Reassign that branch's manager first.`,
      },
      { status: 400 }
    );
  }

  await prisma.appUser.delete({ where: { id: userId } });

  await prisma.auditLog.create({
    data: {
      entityType: "APP_USER",
      entityId: userId,
      action: "DELETED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: {},
    },
  });

  return NextResponse.json({ success: true });
}