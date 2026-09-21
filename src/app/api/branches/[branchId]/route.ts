import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  branchCode: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  managerId: z.string().uuid().nullable().optional(),
  currencyId: z.string().uuid().nullable().optional(),
  defaultLanguage: z.string().optional(),
});

// PATCH /api/branches/:branchId — edit branch details, assign/unassign manager, activate/deactivate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "MANAGE_BRANCHES");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;
  const body = await req.json();
  const parsed = updateBranchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Validate the new manager, if one is being set/changed
  if (parsed.data.managerId) {
    const managerUser = await prisma.appUser.findUnique({ where: { id: parsed.data.managerId } });
    if (!managerUser) {
      return NextResponse.json({ error: "Manager (staff member) not found" }, { status: 404 });
    }

    // Branch.managerId is unique — a staff member can only manage one branch at a time
    const alreadyManaging = await prisma.branch.findFirst({
      where: { managerId: parsed.data.managerId, NOT: { id: branchId } },
    });
    if (alreadyManaging) {
      return NextResponse.json(
        { error: `This staff member already manages ${alreadyManaging.name}. Unassign them there first.` },
        { status: 400 }
      );
    }
  }

  // A branch needs an assigned manager to go ACTIVE
  const resultingManagerId =
    parsed.data.managerId !== undefined ? parsed.data.managerId : existing.managerId;
  const resultingStatus = parsed.data.status ?? existing.status;

  if (resultingStatus === "ACTIVE" && !resultingManagerId) {
    return NextResponse.json(
      { error: "A branch must have an assigned manager to be set ACTIVE." },
      { status: 400 }
    );
  }

  // If the manager is being unassigned (set to null) and the branch was ACTIVE,
  // it falls back to INACTIVE rather than being left in an inconsistent state
  const managerBeingUnassigned =
    parsed.data.managerId === null && existing.managerId !== null;
  const dataToApply = { ...parsed.data };
  if (managerBeingUnassigned && parsed.data.status === undefined) {
    dataToApply.status = "INACTIVE";
  }

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: dataToApply,
  });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branchId,
      action: "UPDATED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: dataToApply,
    },
  });

  return NextResponse.json({ branch });
}

// DELETE /api/branches/:branchId — only allowed if the branch has no staff assigned
// and no transaction/financial history of any kind
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "MANAGE_BRANCHES");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const existing = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const [
    staffCount,
    sentTxCount,
    receivedTxCount,
    commissionTierCount,
    topupCount,
    expenseCount,
  ] = await Promise.all([
    prisma.appUser.count({ where: { branchId } }),
    prisma.transaction.count({ where: { senderBranchId: branchId } }),
    prisma.transaction.count({ where: { receiverBranchId: branchId } }),
    prisma.commissionTier.count({ where: { branchId } }),
    prisma.topup.count({ where: { branchId } }),
    prisma.expense.count({ where: { branchId } }),
  ]);

  const totalActivity =
    staffCount + sentTxCount + receivedTxCount + commissionTierCount + topupCount + expenseCount;

  if (totalActivity > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete: this branch has staff, transactions, or financial records on file. Deactivate it instead.",
      },
      { status: 400 }
    );
  }

  await prisma.branch.delete({ where: { id: branchId } });

  await prisma.auditLog.create({
    data: {
      entityType: "BRANCH",
      entityId: branchId,
      action: "DELETED",
      performedByAdminId: auth.role === "SUPER_ADMIN" ? auth.id : undefined,
      performedByUserId: auth.role === "SUPER_ADMIN" ? undefined : auth.id,
      metadata: {},
    },
  });

  return NextResponse.json({ success: true });
}

// GET /api/branches/:branchId — fetch a single branch's details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const auth = await requirePermission(req, "VIEW_BRANCHES");
  if (auth instanceof NextResponse) return auth;

  const { branchId } = await params;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}